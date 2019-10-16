'use strict';

import test from 'ava';
import sinon from 'sinon';
import { Readers } from '../lib/readers';

test.beforeEach(t => t.context = { sandbox: sinon.createSandbox() });
test.afterEach(t => t.context.sandbox.restore());

test('readers - state non-arn string', t => {
    const { state } = Readers();
    t.deepEqual(state('foo'), { Name: 'foo', Type: 'Task', Resource: 'foo' });
});

test('readers - state arn string', t => {
    const { state } = Readers();
    t.deepEqual(state('arn:aws:foo'), { Name: 'foo_0', Type: 'Task', Resource: 'arn:aws:foo' });
});

test('readers - state non-arn array length 2', t => {
    const { state } = Readers();
    t.deepEqual(state([ '$.foo', 'foo' ]), { Name: 'foo', Type: 'Task', Resource: 'foo', InputPath: '$.foo' });
});

test('readers - state non-arn array length 2 - alt order', t => {
    const { state } = Readers();
    t.deepEqual(state([ 'foo', '$.foo' ]), { Name: 'foo', Type: 'Task', Resource: 'foo', ResultPath: '$.foo' });
});

test('readers - state arn array length 1', t => {
    const { state } = Readers();
    t.deepEqual(state([ 'arn:aws:foo' ]), { Name: 'foo_0', Type: 'Task', Resource: 'arn:aws:foo' });
});

test('readers - state non-arn array length 1', t => {
    const { state } = Readers();
    t.deepEqual(state([ 'foo' ]), { Name: 'foo', Type: 'Task', Resource: 'foo' });
});

test('readers - state arn array length 2', t => {
    const { state } = Readers();
    t.deepEqual(state([ '$.foo', 'arn:aws:foo' ]), { Name: 'foo_0', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo' });
});

test('readers - state arn array length 2 - alt order', t => {
    const { state } = Readers();
    t.deepEqual(state([ 'arn:aws:foo', '$.foo'  ]), { Name: 'foo_0', Type: 'Task', Resource: 'arn:aws:foo', ResultPath: '$.foo' });
});

test('readers - state non-arn array length 3', t => {
    const { state } = Readers();
    t.deepEqual(state([ '$.foo', 'foo', '$.bar' ]), { Name: 'foo', Type: 'Task', Resource: 'foo', InputPath: '$.foo', ResultPath: '$.bar' });
});

test('readers - state arn array length 3', t => {
    const { state } = Readers();
    t.deepEqual(state([ '$.foo', 'arn:aws:foo', '$.bar' ]), { Name: 'foo_0', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' });
});

test('readers - state object - literal props', t => {
    const { state } = Readers();
    const input =  { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' };
    const output = { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' };
    t.deepEqual(state(input), output);
});

test('readers - state object - shorthand props', t => {
    const { state } = Readers();
    const input =  { n: 'foo', t: 'Task', r: 'arn:aws:foo', i: '$.foo', resu: '$.bar' };
    const output = { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' };
    t.deepEqual(state(input), output);
});

