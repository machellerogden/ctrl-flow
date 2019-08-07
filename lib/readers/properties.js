'use strict';

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

    next: 'Next',
    end: 'End',

    n: 'Name',
    name: 'Name',

    branches: 'Branches'
};

module.exports = propMap;
