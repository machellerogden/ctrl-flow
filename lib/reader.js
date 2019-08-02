'use strict';

const pdn = require('pdn');
const streamify = require('async-stream-generator');
const { linebreak, stringify, pipe } = require('./util');
const { Readers } = require('./readers');


function read(input) {
    const readers = Readers();
    const opts = { readers };
    return pdn.read(input, opts);
}

async function readAll(input) {
    const readers = Readers();
    const opts = { readers };
    return await pdn.readAll(input, opts);
}

const readToStream = pipe(read, stringify, linebreak, streamify);

module.exports = {
    read,
    readAll,
    readToStream
};
