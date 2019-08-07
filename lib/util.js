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


module.exports = {
    linebreak,
    stringify,
    pipe,
    filterNilKeys,
    renameKeys
};
