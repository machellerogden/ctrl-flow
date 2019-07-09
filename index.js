#!/usr/bin/env node
'use strict';

const isCI = require('is-ci')
const clipboardy = require('clipboardy');
const nil = void 0;

const counters = {};

function generateName(type, i) {
    const key = `${type}-${i}`;
    const lastKey = `${type}-${i - 1}`;
    const count = counters[key]
        ? counters[key]
        : (counters[key] = (counters[lastKey] || 0) + 1);
    return `${type}-${count}`;
}

const terminalTypes = new Set(['Succeed', 'Fail', 'Choice']);

const chain = (state, next) => {
    if (terminalTypes.has(state.Type)) return state;
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
        Type: 'Pass',
        Parameters: Parameters ? JSON.parse(Parameters) : nil
    }),
    succeed: () => ({
        Type: 'Succeed'
    }),
    fail: (Error, Cause) => ({
        Type: 'Fail',
        Error,
        Cause
    }),
    choice: (Choices) => ({
        Type: 'Choice',
        Choices: JSON.parse(Choices)
    }),
    parallel: (Branches) => ({
        Type: 'Parallel',
        Branches: JSON.parse(Branches)
    }),
    wait: (Seconds) => ({
        Type: 'Wait',
        Seconds: parseInt(Seconds, 10)
    })
};

function StateMachine(StartsAt, States) {
    return {
        StartsAt,
        States
    };
}

function getArgs(arg, type, args, i) {
    return arg.startsWith('@') && args.length === 0
        ? [ generateName(type, i), ...args ]
        : [ arg, arg, args ];
}

function parseState(arg, i) {
    const {
        groups: {
            type = 'task',
            raw
        } = {}
    } = arg.match(/^@(?<type>[^\/]+)\/?(?<raw>.+)?/) || {};
    const [ name, ...args ] = getArgs(arg, type, raw ? raw.split('::') : [], i);
    return { name, type, args };
}

function filterNilKeys(obj) {
    return Object.entries(obj).reduce((acc, [ key, value ]) => {
        if (value != null) {
            acc[key] = value;
        }
        return acc;
    }, {});
}

function State(type, ...args) {
    return filterNilKeys(States[type](...args));
}

function parse(input) {
    const [ StartsAt ] = input;
    const States = input.reduce((states, arg, i, col) => {
        const { name, type, args } = parseState(arg, i);
        const next = col[i + 1];
        const { name:nextName } = next
            ? parseState(next, i + 1)
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
