'use strict';

const {
    filterNilKeys,
    findBestMatch,
    renameKeysToBestMatch
} = require('../util');

/**
 * NB, in priority order
 * ambiguous matches resolve to lower index
 * i.e. 'n' will prefer 'Name' match over 'Next' match
 */
const validProperties = [
    'Type',
    'InputPath',
    'OutputPath',
    'Result',
    'ResultPath',
    'Resource',
    'Name',
    'Next',
    'End',
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
