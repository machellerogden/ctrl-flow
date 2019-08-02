'use strict';

const pdn = require('pdn');
const streamify = require('async-stream-generator');
const { linebreak, stringify, pipe } = require('./util');
const { State } = require('./readers');

function _chain(states) {
    return states.reduce((acc, state, i, col) => {
        let { name, ...props } =
            typeof state === 'string'
                ? {
                    name: state,
                    Type: 'Task',
                    Resource: state,
                    ResultPath: `$.${state}`
                }
                : state;
        if (i === 0) acc.StartsAt = name;
        acc.States[name] = props;
        if (col.length > i + 1) {
            acc.States[name].Next = col[i + 1].name || col[i + 1];
        } else {
            acc.States[name].End = true;
        }
        return acc;
    }, { StartsAt: null, States: {} });
}

async function* chain(states) {

    const resolved = [];

    for await (const state of states) {
        resolved.push(state);
    }

    yield _chain(resolved);
}

function read(input) {
    const { state } = State();
    const opts = { readers: { state } };
    return chain(pdn.read(input, opts));
}

async function readAll(input) {
    const { state } = State();
    const opts = { readers: { state } };
    return _chain(await pdn.readAll(input, opts));
}

const readToStream = pipe(read, stringify, linebreak, streamify);

module.exports = {
    read,
    readAll,
    readToStream
};
