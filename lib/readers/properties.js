'use strict';

const validProperties = [
    'Type',
    'InputPath',
    'OutputPath',
    'Result',
    'ResultPath',
    'Resource',
    'Next',
    'End',
    'Name',
    'Branches'
];

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

function renameResultIfPath(obj = {}) {
    if (typeof obj.Result === 'string' && obj.Result.startsWith('$.')) {
        obj.ResultPath = obj.Result;
        delete obj.Result;
    }
    return obj;
}

function renameStateKeys(state) {
    return renameResultIfPath(renameKeysToBestMatch(state, validProperties));
}

module.exports = { renameStateKeys };
