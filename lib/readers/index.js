'use strict';

const { GenSym } = require('pdn');

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
    resource: 'Resource'
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

function State() {
    const genSym = GenSym();

    function applyDefaults(props = {}) {
        const {
            name,
            Type = 'Task',
            Resource
        } = props;
        const defaults = { Type };
        if (Type === 'Task') defaults.Resource = name;
        if (name == null) {
            defaults.name = genSym(Type);
            if (Resource == null) defaults.Type = 'Pass';
        }
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

    return { state };
}

module.exports = {
    State
};
