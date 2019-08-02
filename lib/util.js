'use strict';

const { EOL } = require('os');

function filterNilKeys(obj) {
    return Object.entries(obj).reduce((acc, [ key, value ]) => {
        if (value != null) acc[key] = value;
        return acc;
    }, {});
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

module.exports = {
    linebreak,
    stringify,
    pipe,
    filterNilKeys
};
