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
    t.deepEqual(state('arn:aws:foo'), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo' });
});

test('readers - state non-arn array length 2', t => {
    const { state } = Readers();
    t.deepEqual(state([ '$.foo', 'foo' ]), { Name: 'foo', Type: 'Task', Resource: 'foo', InputPath: '$.foo' });
});

test('readers - state arn array length 1', t => {
    const { state } = Readers();
    t.deepEqual(state([ 'arn:aws:foo' ]), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo' });
});

test('readers - state non-arn array length 1', t => {
    const { state } = Readers();
    t.deepEqual(state([ 'foo' ]), { Name: 'foo', Type: 'Task', Resource: 'foo' });
});

test('readers - state arn array length 2', t => {
    const { state } = Readers();
    t.deepEqual(state([ '$.foo', 'arn:aws:foo' ]), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo' });
});

test('readers - state non-arn array length 3', t => {
    const { state } = Readers();
    t.deepEqual(state([ 'foo', '$.foo', '$.bar' ]), { Name: 'foo', Type: 'Task', Resource: 'foo', InputPath: '$.foo', ResultPath: '$.bar' });
    // fix me - following should be actual test
    // t.deepEqual(state([ '$.foo', 'foo', '$.bar' ]), { Name: 'foo', Type: 'Task', Resource: 'foo', InputPath: '$.foo', ResultPath: '$.bar' });
});

test('readers - state arn array length 3', t => {
    const { state } = Readers();
    t.deepEqual(state([ 'arn:aws:foo', '$.foo', '$.bar' ]), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' });
    // fix me - following should be actual test
    // t.deepEqual(state([ '$.foo', 'arn:aws:foo', '$.bar' ]), { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' });
});

test('readers - state object', t => {
    const { state } = Readers();
    const input =  { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' };
    const output = { Name: 'foo', Type: 'Task', Resource: 'arn:aws:foo', InputPath: '$.foo', ResultPath: '$.bar' };
    t.deepEqual(state(input), output);
});

