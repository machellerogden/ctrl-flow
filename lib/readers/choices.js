'use strict';
const { isDateish, isNumeric, isBooleanish } = require('../util');

function getTypePrefixes(value) {
    return [
        'String',
        isNumeric(value) && 'Numeric',
        isBooleanish(value) && 'Boolean',
        isDateish(value) && 'Timestamp'
    ].filter(v => v);
}

const strictOperationMap = {
    'str=': 'StringEquals',
    'streq': 'StringEquals',
    'num=': 'NumericEquals',
    'numeq': 'NumericEquals',
    'time=': 'TimestampEquals',
    'timeeq': 'TimestampEquals',
    'str>': 'StringGreaterThan',
    'strgt': 'StringGreaterThan',
    'num>': 'NumericGreaterThan',
    'numgt': 'NumericGreaterThan',
    'time>': 'TimestampGreaterThan',
    'timegt': 'TimestampGreaterThan',
    'str>=': 'StringGreaterThanEquals',
    'strgte': 'StringGreaterThanEquals',
    'num>=': 'NumericGreaterThanEquals',
    'numgte': 'NumericGreaterThanEquals',
    'time>=': 'TimestampGreaterThanEquals',
    'timegte': 'TimestampGreaterThanEquals',
    'str<': 'StringLessThan',
    'strlt': 'StringLessThan',
    'num<': 'NumericLessThan',
    'numlt': 'NumericLessThan',
    'time<': 'TimestampLessThan',
    'timelt': 'TimestampLessThan',
    'str<=': 'StringLessThanEquals',
    'strlte': 'StringLessThanEquals',
    'num<=': 'NumericLessThanEquals',
    'numlte': 'NumericLessThanEquals',
    'time<=': 'TimestampLessThanEquals',
    'timelte': 'TimestampLessThanEquals',
    'bool=': 'BooleanEquals',
    'booleq': 'BooleanEquals'
};

const strictOperations = new Set(Object.keys(strictOperationMap));

const operationMap = {
    '=': 'Equals',
    '==': 'Equals',
    'eq': 'Equals',
    '>': 'GreaterThan',
    'gt': 'GreaterThan',
    '>=': 'GreaterThanEquals',
    'gte': 'GreaterThanEquals',
    '<': 'LessThan',
    'lt': 'LessThan',
    '<=': 'LessThanEquals',
    'lte': 'LessThanEquals'
};

function buildChoice({ operation, variable, value, consequent }) {
    return {
        Variable: variable,
        [operation]: value,
        Next: consequent
    };
}

function buildChoices({ operation, variable, value, consequent }) {
    if (strictOperations.has(operation)) {
        const choice = buildChoice({
            variable,
            operation: strictOperationMap[operation],
            value,
            consequent
        });
        return  [ choice ];
    }
    const op = operationMap[operation];
    if (op == null) throw new SyntaxError('invalid operation');
    const prefixes = getTypePrefixes(value);
    return prefixes.map(prefix => buildChoice({
        variable,
        operation: `${prefix}${op}`,
        value: prefix === 'String'
            ? String(value)
            : value,
        consequent
    }));
}

module.exports = {
    buildChoices
};
