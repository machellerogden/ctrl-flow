#!/usr/bin/env node
'use strict';

const nodes = require('./lib/nodes');
const { Tokenizer } = require('./lib/tokens');
const { nil, terminals, filterNilKeys, chain } = require('./lib/util');
const { createNameFactory } = require('./lib/names');

function State(type, ...args) {
    return filterNilKeys(nodes[type](...args));
}

function Sota() {
    const NameFactory = createNameFactory();
    const { tokenize } = Tokenizer(NameFactory);

    function stateReducer(states, arg, i, col) {
        if (Array.isArray(arg)) {
            return {
                ...states,
                [NameFactory('parallel').next()]: parse(arg)
            };
        }
        const { name, type, args } = arg;
        const unchainedState = State(type, ...args);
        const next = col[i + 1] || {};
        const { name:nextName = false } = next;
        const state = chain(unchainedState, nextName);
        return {
            ...states,
            [name]: state
        };
    }

    function parse(tokens) {
        const States = tokens.reduce(stateReducer, {});
        const [ { name:StartAt } ] = tokens;
        return nodes.branch(StartAt, States);
    }

    function compile(input) {
        return parse(tokenize(input));
    }

    return { compile };
}

module.exports = {
    Sota
};

if (require.main === module) {
    const isCI = require('is-ci')
    const clipboardy = require('clipboardy');
    (async () => {
        try {
            const args = process.argv.slice(2).filter(v => /^[^\-]/.test(v));
            const stateMachine = JSON.stringify(Sota().compile(args), null, 4);
            if (!isCI) await clipboardy.write(stateMachine);
            process.stdout.write(stateMachine);
        } catch (e) {
            console.error(e.stack);
        }
    })();
}
