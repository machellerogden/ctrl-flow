'use strict';

const pdn = require('pdn');
const streamify = require('async-stream-generator');
const { linebreak, stringify, pipe } = require('./util');
const { State } = require('./readers');

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

function read(input) {
    const { state } = State();
    const opts = { readers: { state } };
    return pdn.read(input, opts);
}

function readAll(input) {
    const { state } = State();
    const opts = { readers: { state } };
    return pdn.readAll(input, opts);
}

const readToStream = pipe(read, chain, stringify, linebreak, streamify);

module.exports = {
    read,
    readAll,
    readToStream
};
