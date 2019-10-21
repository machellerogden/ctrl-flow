'use strict';

import test from 'ava';
import sinon from 'sinon';
import { Readers } from '../lib/readers';

test.beforeEach(t => t.context = { sandbox: sinon.createSandbox() });
test.afterEach(t => t.context.sandbox.restore());

test('readers - state non-arn string', async t => {
    const { state } = Readers();
    t.deepEqual(await state('foo'), { Name: 'foo', Type: 'Task', Resource: 'foo' });
});

test('readers - state arn string', async t => {
    const { state } = Readers();
    t.deepEqual(await state('arn:aws:foo'), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo' });
});

test('readers - state non-arn array length 2', async t => {
    const { state } = Readers();
    t.deepEqual(await state([ '$.foo', 'foo' ]), { Name: 'foo', Type: 'Task', Resource: 'foo', InputPath: '$.foo' });
});

test('readers - state non-arn array length 2 - alt order', async t => {
    const { state } = Readers();
    t.deepEqual(await state([ 'foo', '$.foo' ]), { Name: 'foo', Type: 'Task', Resource: 'foo', ResultPath: '$.foo' });
});

test('readers - state arn array length 1', async t => {
    const { state } = Readers();
    t.deepEqual(await state([ 'arn:aws:foo' ]), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo' });
});

test('readers - state non-arn array length 1', async t => {
    const { state } = Readers();
    t.deepEqual(await state([ 'foo' ]), { Name: 'foo', Type: 'Task', Resource: 'foo' });
});

test('readers - state arn array length 2', async t => {
    const { state } = Readers();
    t.deepEqual(await state([ '$.foo', 'arn:aws:foo' ]), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo' });
});

test('readers - state arn array length 2 - alt order', async t => {
    const { state } = Readers();
    t.deepEqual(await state([ 'arn:aws:foo', '$.foo'  ]), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', ResultPath: '$.foo' });
});

test('readers - state non-arn array length 3', async t => {
    const { state } = Readers();
    t.deepEqual(await state([ '$.foo', 'foo', '$.bar' ]), { Name: 'foo', Type: 'Task', Resource: 'foo', InputPath: '$.foo', ResultPath: '$.bar' });
});

test('readers - state arn array length 3', async t => {
    const { state } = Readers();
    t.deepEqual(await state([ '$.foo', 'arn:aws:foo', '$.bar' ]), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' });
});

test('readers - state object - literal props', async t => {
    const { state } = Readers();
    const input =  { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' };
    const output = { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' };
    t.deepEqual(await state(input), output);
});

test('readers - state object - shorthand props', async t => {
    const { state } = Readers();
    const input =  { n: 'foo', t: 'Task', r: 'arn:aws:foo', i: '$.foo', resu: '$.bar' };
    const output = { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' };
    t.deepEqual(await state(input), output);
});

