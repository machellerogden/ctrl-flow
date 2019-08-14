'use strict';

const pdn = require('pdn');
const streamify = require('async-stream-generator');
const { linebreak, stringify, pipe } = require('./util');
const { Readers } = require('./readers');
const { GenSym } = require('./names');

function read(input) {
    const genSym = GenSym();
    const readers = Readers({ genSym });
    const opts = { readers };

    async function* branch(states) {
        const resolved = [];
        for await (const state of states) {
            resolved.push(state);
        }
        yield readers.branch(resolved);
    }

    return branch(pdn.read(input, opts));
}

async function readAll(input) {
    const genSym = GenSym();
    const readers = Readers({ genSym });
    const opts = { readers };
    const branch = await pdn.readAll(input, opts);
    return readers.branch(branch);
}

const readToStream = pipe(read, stringify, linebreak, streamify);

module.exports = {
    read,
    readAll,
    readToStream
};
