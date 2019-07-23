'use strict';

const { EOL } = require('os');
const { createNameFactory } = require('./names');
const { Trampoline } = require('./util');
const { SyntaxError } = require('./errors');

function getArgs(arg, type, args) {
    if (arg.startsWith('@with')) return [ 'with', ...args ];
    return !arg.startsWith('@')
        ? [ arg, arg, ...args ]
        : [ ...args ];
}

const isDefined = v => v != null;
const reserved = new Set([EOL, ',', ' ', '[', ']', '(', ')']);
const listStart = new Set(['[', '(']);
const listEnd = new Set([']', ')']);
const isReserved = v => reserved.has(v);
const isListStart = v => listStart.has(v);
const isListEnd = v => listEnd.has(v);
const isWhitespace = v => /[\s\,]/.test(v);

function Tokenizer() {
    const NameFactory = createNameFactory();

    const createTokens = Trampoline(function _createTokens(arg) {
        if (Array.isArray(arg) && arg.every(Array.isArray)) return () => ({
            name: NameFactory('parallel').next(),
            type: 'parallel',
            args: arg.map(a => a.map(createTokens))
        });
        if (Array.isArray(arg)) throw new SyntaxError('Syntax error - parallel branches must be nested');
        if (typeof arg === 'object') return arg;
        const {
            groups: {
                type = 'task',
                raw
            } = {}
        } = arg.match(/^@(?<type>[^\/]+)\/?(?<raw>.+)?/) || {};

        const [
            name = NameFactory(type).next(),
            ...args
        ] = getArgs(arg, type, raw
            ? raw.split(':')
            : []);

        return { name, type, args };
    });

    function tokenize(input) {
        input = Array.isArray(input)
            ? input
            : [ input ]
        const structured = input.reduce((acc, raw) => {
            const chars = raw.split('');
            const result = [];
            let i = 0;
            const drop = () => chars.splice(i, 1);
            const next = () => i++;
            const stack = [ result ];
            const current = () => stack[stack.length - 1];
            const add = (v) => (current().push(v), v);
            const enter = (v) => (next(), stack.push(add(v)), v);
            const exit = () => (next(), stack.pop());

            while (i < chars.length) {

                if (isListStart(chars[i])) {
                    enter([]);
                    continue;
                }

                if (isListEnd(chars[i])) {
                    exit();
                    continue;
                }

                if (isWhitespace(chars[i])) {
                    drop();
                    continue;
                }

                if (isDefined(chars[i]) && !isReserved(chars[i])) {
                    let value = '';
                    while (isDefined(chars[i]) && !isReserved(chars[i])) value += chars[next()];
                    add(value);
                    continue;
                }

                add(chars[next()]);

            }

            return [ ...acc, ...result ];
        }, []);

        return structured.map(createTokens);
    }

    return { tokenize };
}

module.exports = { Tokenizer };
