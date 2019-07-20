'use strict';

function* NameGenerator(key) {
    const counters = {};
    while (true) {
        yield `${key}-${counters[key]
            ? (counters[key] = counters[key] + 1)
            : (counters[key] = 1)}`;
    }
}

function createNameFactory() {
    const keys = {};
    return function NameFactory(key) {
        let iter = keys[key] = keys[key] || NameGenerator(key);
        const next = () => iter.next().value;
        return { next };
    };
}

module.exports = {
    createNameFactory
};
