'use strict';

const test = require('ava');
const sinon = require('sinon');
const { readAll } = require('..');

test.beforeEach(t => t.context = { sandbox: sinon.createSandbox() });
test.afterEach(t => t.context.sandbox.restore());

test('simple strings are turned into tasks', async t => {
    const definition = {
        StartAt: 'a_0',
        States: {
            a_0: {
                Type: 'Task',
                Resource: 'a',
                Next: 'b_0'
            },
            b_0: {
                Type: 'Task',
                Resource: 'b',
                Next: 'c_0'
            },
            c_0: {
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
        StartAt: 'parallel_0',
        States: {
            'parallel_0': {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'a_0',
                        States: {
                            a_0: {
                                Type: 'Task',
                                Resource: 'a',
                                End: true
                            }
                        }
                    },
                    {
                        StartAt: 'b_0',
                        States: {
                            b_0: {
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
    t.deepEqual(await readAll('@= [a b]'), definition);
    t.deepEqual(await readAll('@= [a [b]]'), definition);
    t.deepEqual(await readAll('@= [[a] b]'), definition);
    t.deepEqual(await readAll('@= [[a] [b]]'), definition);
    t.deepEqual(await readAll('@parallel[@branch a @branch b]'), definition);
    t.deepEqual(await readAll('@parallel[@branch[a] @branch[b]]'), definition);
    t.deepEqual(await readAll('@parallel[a b]'), definition);
    t.deepEqual(await readAll('@parallel[[a] [b]]'), definition);
});

test('parallel 2', async t => {
    const definition = {
        StartAt: 'parallel_0',
        States: {
            'parallel_0': {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'a_0',
                        States: {
                            a_0: {
                                Type: 'Task',
                                Resource: 'a',
                                Next: 'aa_0'
                            },
                            aa_0: {
                                Type: 'Task',
                                Resource: 'aa',
                                End: true
                            }
                        }
                    },
                    {
                        StartAt: 'b_0',
                        States: {
                            b_0: {
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
    t.deepEqual(await readAll('@= [[a aa] b]'), definition);
    t.deepEqual(await readAll('@= [[a aa] [b]]'), definition);
    t.deepEqual(await readAll('@parallel[@branch [a aa] b]'), definition);
    t.deepEqual(await readAll('@parallel[@branch [a aa] @branch b]'), definition);
    t.deepEqual(await readAll('@parallel[@branch[a aa] @branch[b]]'), definition);
    t.deepEqual(await readAll('@parallel[[a aa] @branch[b]]'), definition);
    t.deepEqual(await readAll('@parallel[[a aa] b]'), definition);
    t.deepEqual(await readAll('@parallel[[a aa] [b]]'), definition);
});

test('choices so many choices', async t => {
    const definition = {
        StartAt: 'a_0',
        States: {
            a_0: {
                Type: 'Task',
                Resource: 'a',
                Next: 'choice_0'
            },
            'choice_0': {
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
                Next: 'choice_0'
            },
            'choice_0': {
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
                Next: 'choice_0'
            },
            'choice_0': {
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

test('state params', async t => {
    const input = `
    @state [
        {
            foo.$ $.bar
            test params
        }
        arn:aws:foo
    ]`;
    const output = {
        StartAt: 'foo_0',
        States: {
            foo_0: {
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

test('resolver works', async t => {
    const input = `foo bar baz`;

    const output = {
        StartAt: 'foo_0',
        States: {
            foo_0: {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'a',
                        States: {
                            a: {
                                Type: 'Pass',
                                Next: 'b'
                            },
                            b: {
                                Type: 'Pass',
                                Next: 'c'
                            },
                            c: {
                                Type: 'Pass',
                                End: true
                            }
                        }
                    }
                ],
                OutputPath: '$.0[-1:]',
                Next: 'bor_0'
            },
            bor_0: {
                Type: 'Task',
                Resource: 'bor',
                Next: 'boz_0'
            },
            boz_0: {
                Type: 'Task',
                Resource: 'boz',
                End: true
            }
        }
    };

    function MockResolver(arg) {
        let map = {
            foo: {
                StartAt: 'a',
                States: {
                    a: {
                        Type: 'Pass',
                        Next: 'b'
                    },
                    b: {
                        Type: 'Pass',
                        Next: 'c'
                    },
                    c: {
                        Type: 'Pass',
                        End: true
                    }
                }
            },
            bar: 'bor',
            baz: 'boz'
        };
        return arg => Promise.resolve(map[arg]);
    }

    t.deepEqual(await readAll(input, { resolver: MockResolver() }), output);
});

test('reworking syntax', async t => {
    const input =
        `@= [
            [ a b c ]
            [ d e f ]
        ]
        @if [
            [ $.foo = $.bar ]
            bam_0
            aaa_0
        ]
        @next [ bam blah_0 ]
        @end blah
        @next [ aaa boom_0 ]
        @end boom`;
    const output = {
        "StartAt": "parallel_0",
        "States": {
            "parallel_0": {
                "Type": "Parallel",
                "Branches": [
                    {
                        "StartAt": "a_0",
                        "States": {
                            "a_0": {
                                "Type": "Task",
                                "Resource": "a",
                                "Next": "b_0"
                            },
                            "b_0": {
                                "Type": "Task",
                                "Resource": "b",
                                "Next": "c_0"
                            },
                            "c_0": {
                                "Type": "Task",
                                "Resource": "c",
                                "End": true
                            }
                        }
                    },
                    {
                        "StartAt": "d_0",
                        "States": {
                            "d_0": {
                                "Type": "Task",
                                "Resource": "d",
                                "Next": "e_0"
                            },
                            "e_0": {
                                "Type": "Task",
                                "Resource": "e",
                                "Next": "f_0"
                            },
                            "f_0": {
                                "Type": "Task",
                                "Resource": "f",
                                "End": true
                            }
                        }
                    }
                ],
                "Next": "choice_0"
            },
            "choice_0": {
                "Type": "Choice",
                "Choices": [
                    {
                        "Variable": "$.foo",
                        "StringEquals": "$.bar",
                        "Next": "bam_0"
                    }
                ],
                "Default": "aaa_0"
            },
            "bam_0": {
                "Type": "Task",
                "Resource": "bam",
                "Next": "blah_0"
            },
            "blah_0": {
                "Type": "Task",
                "Resource": "blah",
                "End": true
            },
            "aaa_0": {
                "Type": "Task",
                "Resource": "aaa",
                "Next": "boom_0"
            },
            "boom_0": {
                "Type": "Task",
                "Resource": "boom",
                "End": true
            }
        }
    }
    t.deepEqual(await readAll(input), output);
});
