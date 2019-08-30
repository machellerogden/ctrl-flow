'use strict';

const pdn = require('pdn');
const streamify = require('async-stream-generator');
const { linebreak, stringify, pipe } = require('./util');
const { Readers } = require('./readers');

const inferBranch = branch =>
    branch.length === 1 && branch[0].StartAt
        ? branch[0]
        : branch;

function read(input) {
    const readers = Readers();
    const opts = { readers };

    async function* branch(states) {
        const resolved = [];
        for await (const state of states) {
            resolved.push(state);
        }
        yield readers.branch(inferBranch(resolved));
    }

    return branch(pdn.read(input, opts));
}

async function readAll(input) {
    const readers = Readers();
    const opts = { readers };
    const branch = await pdn.readAll(input, opts);
    return readers.branch(inferBranch(branch));
}

const readToStream = pipe(read, stringify, linebreak, streamify);

module.exports = {
    read,
    readAll,
    readToStream
};
