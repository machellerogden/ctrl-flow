'use strict';

const { createNameFactory } = require('./names');
const { Trampoline } = require('./util');

function getArgs(arg, type, args) {
    const expr = arg.startsWith('@');
    return (!expr)
        ? [ arg, arg, ...args ]
        : [ ...args ];
}

function Tokenizer() {
    const NameFactory = createNameFactory();

    const createTokens = Trampoline(function _createTokens(arg) {
        if (Array.isArray(arg)) return () => arg.map(createTokens);
        const {
            groups: {
                type = 'task',
                raw
            } = {}
        } = arg.match(/^@(?<type>[^\/]+)\/?(?<raw>.+)?/) || {};

        const generateName = NameFactory(type);

        const [
            name = generateName(true),
            ...args
        ] = getArgs(arg, type, raw
            ? raw.split('::')
            : []);

        return { name, type, args };
    });

    function tokenize(input) {
        const structured = input.reduce((acc, arg) => {
            if (!/\[.*\]/.test(arg)) return [ ...acc, arg ];
            let expanded = [];
            const stack = [ expanded ];
            let current = () => stack[stack.length - 1  || 0];
            let i = 0;
            let token = '';
            while (i < arg.length) {
                const cursor = current();
                if (arg[i] === '[') {
                    const next = [];
                    cursor.push(next);
                    stack.push(next);
                    i++;
                    continue;
                }
                if ([ ' ', ']' ].includes(arg[i])) {
                    token = '';
                    if (arg[i] == ']') stack.pop();
                    i++;
                    continue;
                }
                while (![ ' ', '[', ']'].includes(arg[i])) {
                    token += arg[i];
                    i++;
                }
                cursor.push(token);
                token = '';
            }
            return [ ...acc, ...expanded ];
        }, []);
        return createTokens(structured);
    }

    return { tokenize };
}

module.exports = { Tokenizer };
