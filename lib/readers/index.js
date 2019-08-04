'use strict';

const { GenSym } = require('pdn');
const { filterNilKeys } = require('../util');
const terminal = new Set([ 'Choice', 'Succeed', 'Fail' ]);

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

    function shorthand(name) {
        return {
            name: name,
            Type: 'Task',
            Resource: name,
            ResultPath: `$.${name}`
        };
    }

    const choiceBuilder = (...ops) =>
        ([[variable, value] = [], consequent, alternate] = []) => {
            return {
                name: genSym('choice'),
                Type: 'Choice',
                Choices: ops.map(name => 
                    ({
                        Variable: variable,
                        [name]: value,
                        Next: consequent
                    })),
                Default: alternate
            };
        };

    const equals = choiceBuilder('StringEquals', 'NumericEquals', 'BooleanEquals', 'TimestampEquals')
    const gt = choiceBuilder('StringGreaterThan', 'NumericGreaterThan', 'TimestampGreaterThan')
    const gte = choiceBuilder('StringGreaterThanEquals', 'NumericGreaterThanEquals', 'TimestampGreaterThanEquals')
    const lt = choiceBuilder('StringLessThan', 'NumericLessThan', 'TimestampLessThan')
    const lte = choiceBuilder('StringLessThanEquals', 'NumericLessThanEquals', 'TimestampLessThanEquals')

    const choiceBuilders = {
        equals,
        eq: equals,
        '=': equals,
        '==': equals,
        '===': equals, // TODO: implement strict equality based on value type
        gt,
        '>': gt,
        gte,
        '>=': gte,
        lt,
        '<': lt,
        lte,
        '<=': lte
    };

    function _if ([[variable, operation, value] = [], consequent, alternate] = []) {
        return choiceBuilders[operation]([[variable, value], consequent, alternate]);
    }

    function branch(states) {
        const {
            names,
            ...result
        } = states.reduce((acc, state, i, col) => {
            let { name, ...curr } =
                typeof state === 'string'
                ? shorthand(state)
                : Array.isArray(state)
                    ? parallel(state.map(branch))
                    : state.name == null
                        ? {
                            name: genSym((state.Type || '').toLowerCase()),
                            ...state
                          }
                        : state;
            if (i === 0) acc.StartAt = name;
            if (i > 0) {
                const prev = acc.States[acc.names[i - 1]];
                if (!(terminal.has(prev.Type) || prev.Next == null || prev.End == null)) {
                    prev.Next = name;
                } else if (!terminal.has(prev.Type)) {
                    prev.End = true;
                }
            }
            if (i === col.length - 1 && !terminal.has(curr.Type)) {
                curr.End = true;
            }
            acc.States[name] = curr;
            acc.names.push(name);
            return acc;
        }, { names: [], StartAt: null, States: {} });
        return result;
    }

    return {
        branch,
        state,
        parallel,
        'if': _if,
        equals,
        gt,
        gte,
        lt,
        lte
    };
}

module.exports = {
    Readers
};
