'use strict';

const { filterNilKeys, isObject, isString } = require('../util');
const { renameStateKeys, terminals } = require('./properties');
const { buildChoices } = require('./choices');
const { GenSym } = require('../names');
const nil = void 0;

function Readers({ genSym = GenSym(), resolver = v => nil } = {}) {
    const nameMap = {};

    function getName(resource, generateNewName) {
        let curr = resource.Name || resource;
        if (!isString(curr)) throw new Error('Invalid input');
        const Name = genSym(curr.split(':').pop(), !generateNewName);
        if (generateNewName) return Name;
        if (curr.includes(':')) return curr;
        if (nameMap[curr]) return nameMap[curr];
        nameMap[curr] = Name;
        return Name;
    }

    const Task = generateNewName => ({ Resource, Parameters, InputPath, ResultPath }) =>
        filterNilKeys({
            Type: 'Task',
            Name: getName(Resource, generateNewName),
            Parameters,
            InputPath,
            Resource,
            ResultPath
        });

    async function resolve(arg) {
        if (!isString(arg)) return arg;
        return await resolver(arg) || arg;
    }

    function submachine(name, machine) {
        return {
            Type: 'Parallel',
            Branches: [ machine ],
            Name: genSym(name),
            OutputPath: '$.0[-1:]'
        };
    }

    const isJSONPath = v =>
        isString(v) && (v === '$' || v.startsWith('$.') || v.startsWith('$['));

    async function shorthand(args, generateNewName = true) {
        if (isJSONPath(args)) return params(args);

        const resolved = await resolve(args);

        if (isJSONPath(resolved))
            return params(resolved);

        if (resolved.StartAt)
            return submachine(args, resolved);

        const task = Task(generateNewName);

        if ([ 'string', 'function' ].includes(typeof resolved))
            return task({ Resource: resolved });

        if (!Array.isArray(resolved))
            throw new Error('Invalid input.');

        if (resolved.length === 1) {
            const Resource = resolved[0];
            return task({ Resource });
        }

        if (resolved.length === 2) {
            if (isJSONPath(resolved[0])) {
                const [ InputPath, Resource ] = resolved;
                return task({ InputPath, Resource });
            }
            if (isJSONPath(resolved[1]) || !isString(resolved[1])) {
                const [ Resource, Result ] = resolved;
                const ResultType = isJSONPath(resolved[1])
                    ? 'ResultPath'
                    : 'Result';
                return task({ Resource, [ResultType]: Result });
            }
            const [ Parameters, Resource ] = resolved;
            return task({ Parameters, Resource });
        }

        if (resolved.length === 3) {
            const [ Input, Resource, Result ] = resolved;
            const InputType = isJSONPath(Input)
                ? 'InputPath'
                : 'Parameters';
            const ResultType = isJSONPath(Result)
                ? 'ResultPath'
                : 'Result';
            return task({ [InputType]: Input, Resource, [ResultType]: Result });
        }
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

    async function state(obj, { generateNewName = true } = {}) {
        if (isString(obj) || Array.isArray(obj)) return await shorthand(obj, generateNewName);
        if (typeof obj !== 'object') {
            throw new SyntaxError('Invalid state object');
        }
        return translate(obj);
    }

    async function parallel(Branches) {
        if (!Array.isArray(Branches)) Branches = [ Branches ];
        Branches = await Promise.all(Branches.map(branch));
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
            Default
        };
    }

    function _if([[variable, operation, value] = [], consequent, alternate] = []) {
        return choice(buildChoices({ operation, variable, value, consequent }), alternate);
    }

    async function branch(input) {
        if (input.StartAt) return input;
        const states = Array.isArray(input)
            ? input
            : [ input ];
        const {
            names,
            ...result
        } = await states.reduce(async (accp, s, i, col) => {
            const acc = await accp;
            let { Name, ...curr } =
                isString(s) || Array.isArray(s) ? await shorthand(s, true)
              : s.Name == null                  ? { Name: genSym((s.Type || '').toLowerCase()), ...s }
              : s;
            if (i === 0) acc.StartAt = Name;
            if (i > 0) {
                const prev = acc.States[acc.names[i - 1]];
                if (!terminals.has(prev.Type) && (prev.Next == null && prev.End == null)) {
                    prev.Next = Name;
                } else if (!terminals.has(prev.Type) && prev.Next == null) {
                    prev.End = true;
                }
            }
            if (i === col.length - 1 && !terminals.has(curr.Type)) {
                curr.End = true;
            }
            acc.States[Name] = curr;
            acc.names.push(Name);
            return acc;
        }, Promise.resolve({ names: [], StartAt: null, States: {} }));
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

    async function params(Parameters = {}) {
        let s;
        if (isJSONPath(Parameters)) {
            s = await state({ Type: 'Pass', OutputPath: Parameters });
        } else {
            s = await state({ Type: 'Pass', Parameters });
        }
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

    async function retry([ input, MaxAttempts = 3, IntervalSeconds = 1, BackoffRate = 1 ] = []) {
        const s = await state(input);
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

    async function $(input) {
        if (!isString(input)) throw new SyntaxError('$ only accepts strings');
        const { Parameters, ...State } = await state(input);
        return State;
    }

    async function next([ input, Next ]) {
        const { Next:_, ...State } = await state(input);
        return { ...State, Next };
    }

    async function end(input) {
        const { Next, ...State } = await state(input);
        return { ...State, End: true };
    }

    async function name([ Name, input ]) {
        const State = await state(input);
        return { ...State, Name };
    }

    return {
        branch,
        pass,
        fail,
        name,
        next,
        end,
        state,
        parallel,
        '=': parallel,
        'if': _if,
        'try': _try,
        retry,
        params,
        '': params,
        $
    };
}

module.exports = {
    Readers
};
