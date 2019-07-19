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

function preprocess(input) {
    return input.reduce((acc, arg) => {
        const result =  arg.includes(',')
            ? arg.split(',').map(v => v.split('+'))
            : arg;
        return [ ...acc, result ];
    }, []);
}

function Parser() {
    const NameFactory = CreateNameFactory();

    function parseState({ arg, isNext = false }) {
        if (Array.isArray(arg) && Array.isArray(arg[0])) {
            return {
                name: NameFactory('parallel')(isNext),
                state: State('parallel', arg.map(branch => branch.map(a => parseState({ arg: a }))))
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
