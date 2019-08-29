'use strict';

const { filterNilKeys } = require('../util');
const { renameStateKeys, terminals } = require('./properties');
const { buildChoices } = require('./choices');
const { GenSym } = require('../names');

function Readers({ genSym = GenSym() } = {}) {
    const nameMap = {};

    function getName(resource, generateNewName) {
        if (generateNewName) return genSym(resource.split(':').pop());
        if (!resource.includes(':')) return resource;
        if (nameMap[resource]) return nameMap[resource];
        const Name = genSym(resource.split(':').pop());
        nameMap[resource] = Name;
        return Name;
    }

    function shorthand(args, generateNewName) {
        let [
            InputPath,
            Resource,
            ResultPath
        ] = Array.isArray(args)
            ? args.length === 1
                ? [ null, args[0] ]
                : args.length === 2
                    ? args[0].startsWith('$')
                        ? args
                        : [ null, args[0], args[1] ]
                    : args
            : [ null, args ];
        return filterNilKeys({
            Name: getName(Resource, generateNewName),
            Type: 'Task',
            Resource,
            InputPath,
            ResultPath
        });
    }

    function applyDefaults(props = {}) {
        let {
            Name,
            Type = 'Task',
            Resource
        } = props;
        if (Type === 'Task') Resource = Name;
        if (Name == null) Name = genSym(Type.toLowerCase());
        if (Resource == null) Type = 'Pass';
        const defaults = filterNilKeys({
            Name,
            Type,
            Resource
        });
        return { ...defaults, ...props };
    }

    function translate(obj) {
        const renamed = renameStateKeys(obj);
        return applyDefaults(renamed);
    }

    function state(obj, generateNewName = false) {
        if (typeof obj === 'string' || Array.isArray(obj)) return shorthand(obj, generateNewName);
        if (typeof obj !== 'object') {
            throw new SyntaxError('Invalid state object');
        }
        return translate(obj);
    }

    function dupe(obj) {
        return state(obj, true);
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
            Default: getName(Default)
        };
    }

    function _if ([[variable, operation, value] = [], consequent, alternate] = []) {
        return choice(buildChoices({ operation, variable, value, consequent: getName(consequent) }), alternate);
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

    function pass(Name) {
        return state({ Name, Type: 'Pass' });
    }

    function fail(Name) {
        return state({ Name, Type: 'Fail' });
    }

    function succeed(Name) {
        return state({ Name, Type: 'Succeed' });
    }

    function remap(Parameters = {}) {
        const s = state({ Type: 'Pass', Parameters });
        delete s.ResultPath;
        return s;
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
                    Next: getName(Next)
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
        pass,
        fail,
        state,
        '@': state,
        '-': state,
        dupe,
        '^': dupe,
        parallel,
        'if': _if,
        'try': _try,
        retry,
        remap,
        re: remap
    };
}

module.exports = {
    Readers
};
