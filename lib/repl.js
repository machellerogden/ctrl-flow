'use strict';

const repl = require('repl');
const { inspect } = require('util');
const { readAll } = require('./reader');
const clipboardy = require('clipboardy');

function pprint(v) {
    return inspect(v, { depth: null, colors: true });
}

function evaluate(cmd, context, filename, callback) {
    return readAll(cmd)
        .then(output => callback(null, output))
        .catch(error => {
            if (isRecoverableError(error)) {
                return callback(new repl.Recoverable(error));
            }
        });
}

function isRecoverableError(error) {
    if (error.name === 'SyntaxError') {
        return /^Unexpected end of input/.test(error.message);
    }
    return false;
}

function writer(output) {
    try {
        const str = JSON.stringify(output[0]);
        clipboardy.write(str).catch(() => {});
    } catch(e) {}
    return pprint(output);
}

function start() {
    return repl.start({
        eval: evaluate,
        writer
    });
}

module.exports = {
    start
};
