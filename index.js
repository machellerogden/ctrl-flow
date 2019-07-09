#!/usr/bin/env node
'use strict';

const isCI = require('is-ci')
const clipboardy = require('clipboardy');

const counters = {};

function generateName(type) {
    counters[type] = counters[type]
        ? counters[type] + 1
        : 1;
    return `${type}-${counters[type]}`;
}


const chain = (state, next) => {
    if (next) {
        state.Next = next;
    } else {
        state.End = true;
    }
    return state;
};

const States = {
    task: (Resource) => ({
        Type: 'Task',
        Resource
    }),
    pass: (Parameters) => ({
        Type: 'pass',
        Parameters: JSON.parse(Parameters)
    })
};

function StateMachine(StartsAt, States) {
    return {
        StartsAt,
        States
    };
}

function getArgs(arg, type, args) {
    return arg.startsWith('@') && args.length <= 1
        ? [ generateName(type), ...args ]
        : args;
}

function parseState(arg) {
    const {
        groups: {
            type = 'task',
            argString = arg
        } = {}
    } = arg.match(/^@(?<type>[^\/]+)\/(?<argString>.*)/) || {};
    const [ name, ...args ] = getArgs(arg, type, argString.split('::'));
    return { name, type, args };
}

function State(type, ...args) {
    return States[type](...args);
}

function parse(input) {
    const [ StartsAt ] = input;
    const States = input.reduce((states, arg, i, col) => {
        const { name, type, args } = parseState(arg);
        const next = col[i + 1];
        const { name:nextName } = next
            ? parseState(next)
            : false;
        const unchainedState = State(type, ...args);
        const state = chain(unchainedState, nextName);
        return {
            ...states,
            [name]: state
        };
    }, {});
    return StateMachine(StartsAt, States);
}

if (require.main === module) {
    (async () => {
        try {
            const args = process.argv.slice(2).filter(v => /^[^\-]/.test(v));
            const stateMachine = JSON.stringify(parse(args), null, 4);
            if (!isCI) await clipboardy.write(stateMachine);
            process.stdout.write(stateMachine);
        } catch (e) {
            console.error(e.stack);
        }
    })();
}
