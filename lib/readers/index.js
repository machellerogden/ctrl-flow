'use strict';

const { filterNilKeys } = require('../util');
const { renameStateKeys, terminals } = require('./properties');
const { buildChoices } = require('./choices');

function Readers({ genSym }) {
    const nameMap = {};

    function createName(resource) {
        if (!resource.includes(':')) return resource;
        if (nameMap[resource]) return nameMap[resource];
        const Name = genSym(resource.split(':').pop());
        nameMap[resource] = Name;
        return Name;
    }

    function shorthand(Name) {
        const Resource = Name;
        Name = createName(Resource);
        return {
            Name,
            Type: 'Task',
            Resource,
            ResultPath: `$.${Name}`
        };
    }

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
        const defaulted = { ...defaults, ...props };
        return defaulted;
    }

    function translate(obj) {
        const renamed = renameStateKeys(obj);
        return applyDefaults(renamed);
    }

    function state(obj) {
        if (typeof obj === 'string') return shorthand(obj);
        if (typeof obj !== 'object' || Array.isArray(obj)) {
            throw new SyntaxError('Invalid state object');
        }
        return translate(obj);
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

    function choice(Choices, Default) {
        return {
            Name: genSym('choice'),
            Type: 'Choice',
            Choices,
            Default: createName(Default)
        };
    }

    function _if ([[variable, operation, value] = [], consequent, alternate] = []) {
        return choice(buildChoices({ operation, variable, value, consequent: createName(consequent) }), alternate);
    }

    function branch(input) {
        if (input.StartAt) return input;
        const states = Array.isArray(input)
            ? input
            : [ input ];
        const {
            names,
            ...result
        } = states.reduce((acc, s, i, col) => {
            let { Name, ...curr } =
                typeof s === 'string'
                ? shorthand(s)
                : Array.isArray(s)
                    ? parallel(s.map(branch))
                    : s.Name == null
                        ? {
                            Name: genSym((s.Type || '').toLowerCase()),
                            ...s
                          }
                        : s;
            if (i === 0) acc.StartAt = Name;
            if (i > 0) {
                const prev = acc.States[acc.names[i - 1]];
                if (!terminals.has(prev.Type) && (prev.Next == null || prev.End == null)) {
                    prev.Next = Name;
                } else if (!terminals.has(prev.Type)) {
                    prev.End = true;
                }
            }
            if (i === col.length - 1 && !terminals.has(curr.Type)) {
                curr.End = true;
            }
            acc.States[Name] = curr;
            acc.names.push(Name);
            return acc;
        }, { names: [], StartAt: null, States: {} });
        return result;
    }

    function fail(Name) {
        return state({ Name, Type: 'Fail' });
    }

    function succeed(Name) {
        return state({ Name, Type: 'Succeed' });
    }

    function _try([ input, Next ] = []) {
        const s = state(input);
        const { Name = 'last' } = s;
        return {
            ...s,
            Catch: [
                {
                    ErrorEqual: [ "States.ALL" ],
                    ResultPath: `$.${Name}-error`,
                    Next: createName(Next)
                }
            ]
        };
    }

    function retry([ input, MaxAttempts = 3, IntervalSeconds = 1, BackoffRate = 1 ] = []) {
        const s = state(input);
        return {
            ...s,
            Retry: [
                {
                    ErrorEquals: [ "States.ALL" ],
                    MaxAttempts,
                    IntervalSeconds,
                    BackoffRate
                }
            ]
        };
    }

    return {
        branch,
        fail,
        state,
        parallel,
        'if': _if,
        'try': _try,
        retry
    };
}

module.exports = {
    Readers
};
