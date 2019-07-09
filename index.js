#!/usr/bin/env node
'use strict';

const isCI = require('is-ci')
const clipboardy = require('clipboardy');

const counters = {};

function generateName(type, i) {
    return `${type}-${i}`;
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
        Type: 'Pass',
        Parameters: JSON.parse(Parameters)
    }),
    succeed: () => ({
        Type: 'Succeed'
    }),
    fail: (Error, Cause) => ({
        Type: 'Fail',
        Error,
        Cause
    })
};

function StateMachine(StartsAt, States) {
    return {
        StartsAt,
        States
    };
}

function getArgs(arg, type, args, i) {
    console.log(args);
    return arg.startsWith('@') && args.length === 0
        ? [ generateName(type, i), ...args ]
        : [ arg, arg, args ];
}

function parseState(arg, i) {
    const {
        groups: {
            type = 'task',
            argString
        } = {}
    } = arg.match(/^@(?<type>[^\/]+)\/?(?<argString>.+)?/) || {};
    const [ name, ...args ] = getArgs(arg, type, argString ? argString.split('::') : [], i);
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
