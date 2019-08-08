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

function findBestMatch(str = '', set = []) {
    let match;
    let bestMatchLength = 0;
    let i = set.length;
    let chars = str.toLowerCase().split('');
    while (i-- > 0) {
        const curr = set[i].toLowerCase();
        if (str === curr) return set[i];
        let j = 0;
        while (chars[j] && curr[j] && chars[j] === curr[j]) j++;
        if (j >= bestMatchLength) {
            bestMatchLength = j;
            match = set[i];
        }
    }
    return match;
}

function renameKeysToBestMatch(obj = {}, keys = []) {
    return Object.entries(obj).reduce((acc, [ k, v ]) => {
        const match = findBestMatch(k, keys);
        if (match != null) {
            acc[match] = v;
            delete acc[k];
        }
        return acc;
    }, obj);
}

module.exports = {
    linebreak,
    stringify,
    pipe,
    filterNilKeys,
    renameKeys,
    findBestMatch,
    renameKeysToBestMatch
};
