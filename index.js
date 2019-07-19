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

function Parser() {
    const NameFactory = CreateNameFactory();

    function parseState({ arg, isNext = false }) {
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

        return { name, type, args };
    }

    function stateReducer(states, arg, i, col) {
        const { name, type, args } = parseState({ arg });
        const next = col[i + 1];
        const { name:nextName } = next
            ? parseState({ arg: next, isNext: true })
            : false;
        const unchainedState = State(type, ...args);
        const state = chain(unchainedState, nextName);
        return {
            ...states,
            [name]: state
        };
    }

    function parse(input) {
        const [ StartAt ] = input;
        const States = input.reduce(stateReducer, {});
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
