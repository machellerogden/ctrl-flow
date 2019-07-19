'use strict';

const nil = void 0;

const terminals = new Set([
    'Succeed',
    'Fail',
    'Choice'
]);

function filterNilKeys(obj) {
    return Object.entries(obj).reduce((acc, [ key, value ]) => {
        if (value != nil) acc[key] = value;
        return acc;
    }, {});
}

function chain(state, next) {
    if (terminals.has(state.Type)) return state;
    if (state.Type === 'Parallel') {
        state.Branches.map(branch => branch.map((arg, i, col) => chain(arg.state, col[i + 1] ? col[i + 1].name : false)));
    }
    if (next) {
        state.Next = next;
    } else {
        state.End = true;
    }
    return state;
}

module.exports = {
    nil,
    terminals,
    filterNilKeys,
    chain
};
