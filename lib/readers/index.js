'use strict';

const { GenSym } = require('pdn');
const { filterNilKeys } = require('../util');

const getResultProp = v =>
    typeof v === 'string' && v.startsWith('$.')
        ? 'ResultPath'
        : 'Result';

const propMap = {
    t: 'Type',
    type: 'Type',

    i: 'InputPath',
    in: 'InputPath',
    input: 'InputPath',
    inputpath: 'InputPath',
    'input-path': 'InputPath',

    o: 'OutputPath',
    out: 'OutputPath',
    output: 'OutputPath',
    outputpath: 'OutputPath',
    'output-path': 'OutputPath',

    r: getResultProp,
    result: getResultProp,
    resultpath: 'ResultPath',
    'result-path': 'ResultPath',

    res: 'Resource',
    resource: 'Resource',

    branches: 'Branches'
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

function branch(states) {
    return states.reduce((acc, state, i, col) => {
        let { name, ...props } =
            typeof state === 'string'
            ? {
                name: state,
                Type: 'Task',
                Resource: state,
                ResultPath: `$.${state}`
            }
            : state;
        if (i === 0) acc.StartAt = name;
        acc.States[name] = props;
        if (col.length > i + 1) {
            acc.States[name].Next = col[i + 1].name || col[i + 1];
        } else {
            acc.States[name].End = true;
        }
        return acc;
    }, { StartAt: null, States: {} });
}

function Readers() {
    const genSym = GenSym();

    function applyDefaults(props = {}) {
        let {
            name,
            Type = 'Task',
            Resource,
            ResultPath
        } = props;
        if (Type === 'Task') Resource = name;
        if (name == null) name = genSym(Type.toLowerCase());
        if (Resource == null) Type = 'Pass';
        if (ResultPath == null) ResultPath = `$.${name}`;
        const defaults = filterNilKeys({
            name,
            Type,
            Resource,
            ResultPath
        });
        return { ...defaults, ...props };
    }

    function translate(props) {
        const renamed = renameKeys(props, propMap);
        return applyDefaults(renamed);
    }

    function state(props) {
        if (typeof props !== 'object' || Array.isArray(props)) {
            throw new SyntaxError('Invalid state props');
        }
        const unchained = translate(props);
        return unchained;
    }

    function parallel(Branches) {
        return {
            name: genSym('parallel'),
            Type: 'Parallel',
            Branches
        };
    }

    return { branch, state, parallel };
}

module.exports = {
    Readers
};
