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

const stateDefaults = { Type: 'Pass' };

function translate(props) {
    const renamed = renameKeys(props, propMap);
    return { ...stateDefaults, ...renamed };
}

function State() {
    const genSym = GenSym();

    function state(props) {
        if (typeof props !== 'object' || Array.isArray(props)) {
            throw new SyntaxError('Invalid state props');
        }
        const translated = translate(props);
        const unchained = translated.name != null
            ? translated
            : { ...translated, name: genSym(translated.type) };
        return unchained;
    }

    return { state };
}

module.exports = {
    State
};
