#!/usr/bin/env node
'use strict';

const { EOL } = require('os');
const { read, readAll } = require('pdn');
const { inspect } = require('util');
const uuid = require('uuid/v4');
const streamify = require('async-stream-generator');

async function* chain(states) {
    const branch = {
        States: {}
    };
    let i = 0;
    for await (const [ name, props ] of states) {
        if (i === 0) branch.StartsAt = name;
        branch.States[name] = props;
        i++;
    }
    yield branch;
}

async function* linebreak(statements) {
    for await (const statement of statements) {
        yield `${statement}${EOL}`;
    }
}

async function* stringify(statements) {
    for await (const statement of statements) {
        yield JSON.stringify(statement);
    }
}

function pipe(...fns) {
    return x => fns.reduce((v, f) => f(v), x);
}

function pprint(v) {
    return inspect(v, { depth: null, colors: true });
}
const getResultProp = v =>
    typeof v === 'string' && v.startsWith('$.')
        ? 'ResultPath'
        : 'Result';

const propMap = {
    type: 'Type',
    i: 'InputPath',
    in: 'InputPath',
    out: 'OutputPath',
    o: 'OutputPath',
    r: getResultProp,
    result: getResultProp
}

function renameKeys(obj, names) {
    return Object.entries(obj).reduce((acc, [ k, v ]) => {
        const key = typeof names[k] === 'function'
            ? names[k](v)
            : names[k];
        if (key) {
            acc[key] = v;
            delete acc[k];
        }
        return acc;
    }, { ...obj });
}

function translate(props) {
    const renamed = renameKeys(props, propMap);
    return { Type: 'Pass', ...renamed };
}

function state(data) {
    if (typeof data !== 'object') throw new SyntaxError('Invalid state data');
    if (!Array.isArray(data)) data = [ data ];
    if (data.length < 1 || typeof data[0] === 'object') data = [ uuid(), ...data ];
    const [ name, props = {} ] = data;
    const unchained = [ name, translate(props) ]
    return unchained;
}

const opts = {
    readers: {
        state
    }
};

const stream = pipe(chain, stringify, linebreak, streamify);

if (require.main === module) {
    return process.stdin.isTTY
        ? process.argv[2] == null
            ? require('repl').start({
                eval: (cmd, context, filename, callback) => readAll(cmd, opts).then(output => callback(null, output)),
                writer: output => output.map(pprint).join(EOL)
              })
            : stream(read(process.argv.slice(2).join(' '), opts)).pipe(process.stdout)
        : stream(read(process.stdin, opts)).pipe(process.stdout);
}
