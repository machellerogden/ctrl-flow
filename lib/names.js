'use strict';

function* NameGen(key) {
    if (!key.length) key = 'sym';
    const counters = {};
    while (true) {
        yield `${key}-${counters[key]
            ? (counters[key] = counters[key] + 1)
            : (counters[key] = 1)}`;
    }
}

function GenSym() {
    const keys = {};
    return function NameFactory(key = '') {
        let iter = keys[key] = keys[key] || NameGen(key);
        return iter.next().value;
    };
}

module.exports = {
    GenSym
};
