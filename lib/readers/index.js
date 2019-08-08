'use strict';

const { GenSym } = require('pdn');
const { filterNilKeys, renameKeys } = require('../util');
const terminal = new Set([ 'Choice', 'Succeed', 'Fail' ]);
const { renameStateKeys } = require('./properties');

function shorthand(Name) {
    return {
        Name,
        Type: 'Task',
        Resource: Name,
        ResultPath: `$.${Name}`
    };
}

function Readers() {
    const genSym = GenSym();

    function applyDefaults(props = {}) {
        let {
            Name,
            Type = 'Task',
            Resource,
            Result,
            ResultPath
        } = props;
        if (Type === 'Task') Resource = Name;
        if (Name == null) Name = genSym(Type.toLowerCase());
        if (Resource == null) Type = 'Pass';
        if (Result == null && ResultPath == null) ResultPath = `$.${Name}`;
        const defaults = filterNilKeys({
            Name,
            Type,
            Resource,
            ResultPath
        });
        return { ...defaults, ...props };
    }

    function translate(obj) {
        const renamed = renameStateKeys(obj);
        return applyDefaults(renamed);
    }

    function state(obj) {
        if (typeof obj !== 'object' || Array.isArray(obj)) {
            throw new SyntaxError('Invalid state object');
        }
        const unchained = translate(obj);
        return unchained;
    }

    function parallel(Branches) {
        if (!Array.isArray(Branches)) Branches = [ Branches ];
        Branches = Branches.map(branch);
        return {
            Name: genSym('parallel'),
            Type: 'Parallel',
            Branches
        };
    }

    const choiceBuilder = (...ops) =>
        ([[variable, value] = [], consequent, alternate] = []) => {
            return {
                Name: genSym('choice'),
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

    function branch(input) {
        if (input.StartAt) return input;
        const states = Array.isArray(input)
            ? input
            : [ input ];
        const {
            names,
            ...result
        } = states.reduce((acc, state, i, col) => {
            let { Name, ...curr } =
                typeof state === 'string'
                ? shorthand(state)
                : Array.isArray(state)
                    ? parallel(state.map(branch))
                    : state.Name == null
                        ? {
                            Name: genSym((state.Type || '').toLowerCase()),
                            ...state
                          }
                        : state;
            if (i === 0) acc.StartAt = Name;
            if (i > 0) {
                const prev = acc.States[acc.names[i - 1]];
                if (!terminal.has(prev.Type) && (prev.Next == null || prev.End == null)) {
                    prev.Next = Name;
                } else if (!terminal.has(prev.Type)) {
                    prev.End = true;
                }
            }
            if (i === col.length - 1 && !terminal.has(curr.Type)) {
                curr.End = true;
            }
            acc.States[Name] = curr;
            acc.names.push(Name);
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
