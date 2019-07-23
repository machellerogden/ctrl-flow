'use strict';

const { compile } = require('../index');
const { inspect } = require('util');
const clipboardy = require('clipboardy');
const repl = require('repl');

function copy(obj) {
    try {
        const str = JSON.stringify(v);
        clipboardy.write(str).catch(() => {});
    } catch(e) {}
}

function writer(v) {
    copy(v);
    return inspect(v, { depth: null, colors: true });
}

function evaluate(cmd, context, filename, callback) {
    let result;
    try {
        result = compile(cmd);
    } catch (e) {
        if (isRecoverableError(e)) {
            return callback(new repl.Recoverable(e));
        }
    }
    callback(null, result);
}

function isRecoverableError(error) {
    if (error.name === 'SyntaxError') {
        return /^Unexpected end of input/.test(error.message);
    }
    return false;
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
