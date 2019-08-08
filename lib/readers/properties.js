'use strict';

const {
    filterNilKeys,
    findBestMatch,
    renameKeysToBestMatch
} = require('../util');

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

const terminals = new Set([
    'Choice',
    'Succeed',
    'Fail'
]);

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

module.exports = { renameStateKeys, terminals };
