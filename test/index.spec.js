'use strict';

import test from 'ava';
import sinon from 'sinon';
import { readAll } from '..';

test.beforeEach(t => t.context = { sandbox: sinon.createSandbox() });
test.afterEach(t => t.context.sandbox.restore());

test('simple strings are turned into tasks', async t => {
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
    t.deepEqual(await readAll([
        'a',
        'b',
        'c'
    ]), definition);
});

test('you can always use full reader specification instead of shorthand', async t => {
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                ResultPath: '$.a',
                Next: 'b'
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                ResultPath: '$.b',
                Next: 'c'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                ResultPath: '$.c',
                End: true
            }
        }
    };
    t.deepEqual(await readAll([
        '@state{name: a, type: Task, result-path: $.a, next: b}',
        '@state{name: b, type: Task, result-path: $.b, next: c}',
        '@state{name: c, type: Task, result-path: $.c, end: true}'
    ]), definition);
});

test('you can use shorthand on properties', async t => {
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                ResultPath: '$.a',
                Next: 'b'
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                ResultPath: '$.b',
                Next: 'c'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                ResultPath: '$.c',
                End: true
            }
        }
    };
    t.deepEqual(await readAll([
        '@state{n: a, t: Task, result: $.a}',
        '@state{n: b, t: Task, result: $.b}',
        '@state{n: c, t: Task, result: $.c}'
    ]), definition);
});

test('parallel', async t => {
    const definition = {
        StartAt: 'parallel',
        States: {
            'parallel': {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'a',
                        States: {
                            a: {
                                Type: 'Task',
                                Resource: 'a',
                                End: true
                            }
                        }
                    },
                    {
                        StartAt: 'b',
                        States: {
                            b: {
                                Type: 'Task',
                                Resource: 'b',
                                End: true
                            }
                        }
                    }
                ],
                End: true
            }
        }
    };
    t.deepEqual(await readAll('[a b]'), definition);
    t.deepEqual(await readAll('[a [b]]'), definition);
    t.deepEqual(await readAll('[[a] b]'), definition);
    t.deepEqual(await readAll('[[a] [b]]'), definition);
    t.deepEqual(await readAll('@parallel[@branch a @branch b]'), definition);
    t.deepEqual(await readAll('@parallel[@branch[a] @branch[b]]'), definition);
    t.deepEqual(await readAll('@parallel[a b]'), definition);
    t.deepEqual(await readAll('@parallel[[a] [b]]'), definition);
});

test('parallel 2', async t => {
    const definition = {
        StartAt: 'parallel',
        States: {
            'parallel': {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'a',
                        States: {
                            a: {
                                Type: 'Task',
                                Resource: 'a',
                                Next: 'aa'
                            },
                            aa: {
                                Type: 'Task',
                                Resource: 'aa',
                                End: true
                            }
                        }
                    },
                    {
                        StartAt: 'b',
                        States: {
                            b: {
                                Type: 'Task',
                                Resource: 'b',
                                End: true
                            }
                        }
                    }
                ],
                End: true
            }
        }
    };
    t.deepEqual(await readAll('[[a aa] b]'), definition);
    t.deepEqual(await readAll('[[a aa] [b]]'), definition);
    t.deepEqual(await readAll('@parallel[@branch [a aa] b]'), definition);
    t.deepEqual(await readAll('@parallel[@branch [a aa] @branch b]'), definition);
    t.deepEqual(await readAll('@parallel[@branch[a aa] @branch[b]]'), definition);
    t.deepEqual(await readAll('@parallel[[a aa] @branch[b]]'), definition);
    t.deepEqual(await readAll('@parallel[[a aa] b]'), definition);
    t.deepEqual(await readAll('@parallel[[a aa] [b]]'), definition);
});

test('choices so many choices', async t => {
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                Next: 'choice'
            },
            'choice': {
                Type: 'Choice',
                Choices: [{
                    Variable: '$.foo',
                    StringEquals: 'bar',
                    Next: 'b'
                }],
                Default: 'c'
            }
        }
    };
    t.deepEqual(await readAll('a @if[[$.foo = bar] b c]'), definition);
});

test('a machine is a machine is a machine', async t => {
    const input = JSON.stringify({
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                Next: 'choice'
            },
            'choice': {
                Type: 'Choice',
                Choices: [{
                    Variable: '$.foo',
                    StringEquals: 'bar',
                    Next: 'b'
                }],
                Default: 'c'
            }
        }
    });
    const output = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                Next: 'choice'
            },
            'choice': {
                Type: 'Choice',
                Choices: [{
                    Variable: '$.foo',
                    StringEquals: 'bar',
                    Next: 'b'
                }],
                Default: 'c'
            }
        }
    };
    t.deepEqual(await readAll(input), output);
});

test('a simple machine is a machine is a machine', async t => {
    const input = `
    {
        Name 'a'
        Type 'Task'
        Resource 'a'
        Next 'choice'
    }
    {
        Name 'choice'
        Type 'Choice'
        Choices [{
            Variable '$.foo'
            StringEquals 'bar'
            Next: 'b'
        }]
        Default: 'c'
    }`;
    const output = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                Next: 'choice'
            },
            'choice': {
                Type: 'Choice',
                Choices: [{
                    Variable: '$.foo',
                    StringEquals: 'bar',
                    Next: 'b'
                }],
                Default: 'c'
            }
        }
    };
    t.deepEqual(await readAll(input), output);
});

test.only('params', async t => {
    const input = `
    @params [
        {
            foo.$ $.bar
            test params
        }
        arn:aws:foo
    ]`;
    const output = {
        StartAt: 'foo',
        States: {
            foo: {
                Type: 'Task',
                Resource: 'arn:aws:foo',
                Parameters: {
                    'foo.$': '$.bar',
                    test: 'params'
                },
                End: true
            }
        }
    };
    t.deepEqual(await readAll(input), output);
});
