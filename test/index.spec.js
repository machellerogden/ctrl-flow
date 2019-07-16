'use strict';

import test from 'ava';
import sinon from 'sinon';
import { Parser } from '..';

test.beforeEach(t => t.context = { sandbox: sinon.createSandbox() });
test.afterEach(t => t.context.sandbox.restore());

test('works', async t => {
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                Next: 'b'
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                Next: 'c'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                End: true
            }
        }
    };
    t.deepEqual(Parser()([
        'a',
        'b',
        'c'
    ]), definition);
});

test('parallel', async t => {
    const definition = {
        StartAt: 'a',
        States: {
            'parallel-1': {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'a',
                        a: {
                            Type: 'Task',
                            Resource: 'a',
                            Next: 'b'
                        },
                        b: {
                            Type: 'Task',
                            Resource: 'b',
                            Next: 'c'
                        }
                    },
                    {
                        StartAt: 'c',
                        c: {
                            Type: 'Task',
                            Resource: 'c',
                            Next: 'd'
                        },
                        d: {
                            Type: 'Task',
                            Resource: 'd',
                            End: true
                        }
                    }
                ]
            }
        }
    };
    t.deepEqual(Parser()([
        'a,b',
        'c,d'
    ]), definition);
});
