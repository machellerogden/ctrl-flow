'use strict';

function* NameGenerator(key) {
    const counters = {};
    while (true) {
        const y = yield 'increment';
        const inc = y ? 1 : 0;
        yield `${key}-${counters[key]
            ? (counters[key] = counters[key] + inc)
            : (counters[key] = 1)}`;
    }
}

function CreateNameFactory() {
    const keys = {};
    return function NameFactory(key) {
        let iter = keys[key] = keys[key] || NameGenerator(key);
        return function getName(next) {
            iter.next();
            if (next) return iter.next(1).value;
            return iter.next().value;
        };
    };
}

module.exports = {
    CreateNameFactory
};
