#!/usr/bin/env node
'use strict';

const { EOL } = require('os');
const pdn = require('pdn');
const { inspect } = require('util');
const uuid = require('uuid/v4');
const streamify = require('async-stream-generator');
const { GenSym } = require('./lib/names');

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
    t: 'Type',
    type: 'Type',

    i: 'InputPath',
    in: 'InputPath',
    input: 'InputPath',
    inputpath: 'InputPath',
    'input-path': 'InputPath',

    o: 'OutputPath',
    out: 'OutputPath',
    output: 'OutputPath',
    outputpath: 'OutputPath',
    'output-path': 'OutputPath',

    r: getResultProp,
    result: getResultProp,
    resultpath: 'ResultPath',
    'result-path': 'ResultPath',

    res: 'Resource',
    resource: 'Resource'
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

const stateDefaults = { Type: 'Pass' };

function translate(props) {
    const renamed = renameKeys(props, propMap);
    return { ...stateDefaults, ...renamed };
}

async function* chain(states) {

    const resolved = [];

    for await (const state of states) {
        resolved.push(state);
    }

    const chained = resolved.reduce((acc, { name, ...props }, i, col) => {
        if (i === 0) acc.StartsAt = name;
        acc.States[name] = props;
        if (col.length > i + 1) {
            acc.States[name].Next = col[i + 1].name;
        } else {
            acc.States[name].End = true;
        }
        return acc;
    }, { States: {} });

    yield chained;
}


function Compiler() {
    const genSym = GenSym();

    function compile(props) {
        if (typeof props !== 'object' || Array.isArray(props)) {
            throw new SyntaxError('Invalid state props');
        }
        const translated = translate(props);
        const unchained = translated.name != null
            ? translated
            : { ...translated, name: genSym(translated.type) };
        return unchained;
    }

    return { compile };

}

function Reader() {
    const { compile:state } = Compiler();
    const opts = { readers: { state } };

    const read = input => pdn.read(input, opts);
    const readAll = input => pdn.readAll(input, opts);
    const readToStream = pipe(read, chain, stringify, linebreak, streamify);

    return {
        read,
        readAll,
        readToStream
    };
}

if (require.main === module) {
    const { readAll, readToStream } = Reader();

    return process.stdin.isTTY
        ? process.argv[2] == null
            ? require('repl').start({
                eval: (cmd, context, filename, callback) => readAll(cmd).then(output => callback(null, output)),
                writer: output => output.map(pprint).join(EOL)
              })
            : readToStream(process.argv.slice(2).join(' ')).pipe(process.stdout)
        : readToStream(process.stdin).pipe(process.stdout);
}
