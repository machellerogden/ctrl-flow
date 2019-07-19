#!/usr/bin/env node
'use strict';

const nodes = require('./lib/nodes');

const {
    nil,
    terminals,
    filterNilKeys,
    chain
} = require('./lib/util');

const { CreateNameFactory } = require('./lib/names');

function State(type, ...args) {
    return filterNilKeys(nodes[type](...args));
}

function getArgs(arg, type, args) {
    const expr = arg.startsWith('@');
    return (!expr)
        ? [ arg, arg, ...args ]
        : [ ...args ];
}

// quick and dirty reader which expands balance groups. good enough to get started.
function preprocess(input) {
    return input.reduce((acc, arg) => {
        if (/\[.*\]/.test(arg)) {
            let expanded = [];
            const stack = [ expanded ];
            let current = () => stack[stack.length - 1  || 0];
            let i = 0;
            let token = '';
            while (i < arg.length) {
                if (arg[i] === '[') {
                    const next = [];
                    current().push(next);
                    stack.push(next);
                } else if (arg[i] === ']') {
                    stack.pop();
                } else if (arg[i] !== ' ') {
                    const curr = current();
                    token += arg[i];
                } else {
                    current().push(token);
                    token = '';
                }
                i++;
            }
            return [ ...acc, expanded ];
        } else {
            return [ ...acc, arg ];
        }
    }, []);
}

function Parser() {
    const NameFactory = CreateNameFactory();

    function stateReducer(states, arg, i, col) {
        const { name, state:unchainedState } = parseState({ arg });
        const next = col[i + 1];
        const { name:nextName } = next
            // TODO: separate parseName fn
            ? parseState({ arg: next, isNext: true })
            : false;
        const state = chain(unchainedState, nextName);
        return {
            ...states,
            [name]: state
        };
    }

    function parseState({ arg, isNext = false }) {
        if (Array.isArray(arg) && Array.isArray(arg[0])) {
            return {
                name: NameFactory('parallel')(isNext),
                state: State('parallel', arg.map(branch => nodes.branch(branch[0], branch.reduce(stateReducer, {}))))
            };
        }
        // TODO: not this, joi
        if (typeof arg !== 'string') throw new Error('invalid');
        const {
            groups: {
                type = 'task',
                raw
            } = {}
        } = arg.match(/^@(?<type>[^\/]+)\/?(?<raw>.+)?/) || {};

        const generateName = NameFactory(type);

        const [
            name = generateName(isNext),
            ...args
        ] = getArgs(arg, type, raw
            ? raw.split('::')
            : []);

        return { name, state: State(type, ...args) };
    }

    function parse(input) {
        const preprocessed = preprocess(input);
        const [ StartAt ] = preprocessed;
        const States = preprocessed.reduce(stateReducer, {});
        return nodes.branch(StartAt, States);
    }

    return parse;
}

module.exports = {
    Parser
};

if (require.main === module) {
    const isCI = require('is-ci')
    const clipboardy = require('clipboardy');
    (async () => {
        try {
            const args = process.argv.slice(2).filter(v => /^[^\-]/.test(v));
            const stateMachine = JSON.stringify(Parser()(args), null, 4);
            if (!isCI) await clipboardy.write(stateMachine);
            process.stdout.write(stateMachine);
        } catch (e) {
            console.error(e.stack);
        }
    })();
}
