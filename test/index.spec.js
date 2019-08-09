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
        '@state{n: a, t: Task, r: $.a}',
        '@state{n: b, t: Task, r: $.b}',
        '@state{n: c, t: Task, r: $.c}'
    ]), definition);
});

test('parallel', async t => {
    const definition = {
        StartAt: 'parallel-1',
        States: {
            'parallel-1': {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'a',
                        States: {
                            a: {
                                Type: 'Task',
                                Resource: 'a',
                                ResultPath: '$.a',
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
                                ResultPath: '$.b',
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
        StartAt: 'parallel-1',
        States: {
            'parallel-1': {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'a',
                        States: {
                            a: {
                                Type: 'Task',
                                Resource: 'a',
                                ResultPath: '$.a',
                                Next: 'aa'
                            },
                            aa: {
                                Type: 'Task',
                                Resource: 'aa',
                                ResultPath: '$.aa',
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
                                ResultPath: '$.b',
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
                ResultPath: '$.a',
                Next: 'choice-1'
            },
            'choice-1': {
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
