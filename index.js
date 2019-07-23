#!/usr/bin/env node
'use strict';

const { Tokenizer } = require('./lib/tokens');
const { nil, terminals, filterNilKeys, chain } = require('./lib/util');
const { createNameFactory } = require('./lib/names');
const { SyntaxError } = require('./lib/errors');

function amend(...args) {
    const obj = args.reduce((acc, v, i, col) => {
        acc[i % 2 ? col[i - 1] : v] = v;
        return acc;
    }, {});
    return obj;
}

function branch(StartAt, States) {
    return {
        StartAt,
        States
    };
}

function task(Resource, ResultPath) {
    ResultPath = ResultPath == null
        ? `$.${Resource}`
        : `$.${ResultPath}`;
    return {
        Type: 'Task',
        Resource,
        ResultPath
    };
}

function pass(Parameters) {
    return {
        Type: 'Pass',
        Parameters: Parameters ? JSON.parse(Parameters) : nil
    };
}

function succeed() {
    return {
        Type: 'Succeed'
    };
}

function fail(Error, Cause) {
    return {
        Type: 'Fail',
        Error,
        Cause
    };
}

function choice(Choices) {
    return {
        Type: 'Choice',
        Choices: JSON.parse(Choices)
    };
}

function parallel(...Branches) {
    return {
        Type: 'Parallel',
        Branches: [ Branches.map(parse) ]
    };
}

function wait(Seconds) {
    return {
        Type: 'Wait',
        Seconds: parseInt(Seconds, 10)
    }
}

const nodes = {
    branch,
    task,
    pass,
    succeed,
    fail,
    choice,
    parallel,
    wait,
    amend
};

function State(type, ...args) {
    return filterNilKeys(nodes[type.toLowerCase()](...args));
}

function stateReducer(states, { name, type, args }, i, col) {
    if (i === 0 && type === 'amend') throw new SyntaxError('amend cannot be the first state');
    if (type === 'amend') {
        const lastToken = col[i - 1];
        const  { name:lastName } = lastToken;
        return {
            ...states,
            [lastName]: Object.assign(states[lastName], State(type, ...args))
        };
    };
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
    const { tokenize } = Tokenizer();
    const tokens = tokenize(input);
    return parse(tokens);
}

module.exports = {
    compile
};

if (require.main === module) {
    if (process.argv[2] == null) return require('./lib/repl').start();
    const data = !process.stdin.isTTY
        ? require('fs').readFileSync(0, 'utf8')
        : null;
    const isCI = require('is-ci')
    const clipboardy = require('clipboardy');
    (async () => {
        try {
            const args = data != null
                ? data
                : process.argv.slice(2).filter(v => /^[^\-]/.test(v));
            const stateMachine = JSON.stringify(compile(args), null, 4);
            if (!isCI) await clipboardy.write(stateMachine);
            process.stdout.write(stateMachine);
        } catch (e) {
            console.error(e.stack);
        }
    })();
}
