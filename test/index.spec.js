'use strict';

import test from 'ava';
import sinon from 'sinon';
import { readAll } from '..';

test.beforeEach(t => t.context = { sandbox: sinon.createSandbox() });
test.afterEach(t => t.context.sandbox.restore());

test('works', async t => {
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

//test('parallel', async t => {
    //const definition = {
        //StartAt: 'parallel-1',
        //States: {
            //'parallel-1': {
                //Type: 'Parallel',
                //Branches: [
                    //{
                        //StartAt: 'a',
                        //States: {
                            //a: {
                                //Type: 'Task',
                                //Resource: 'a',
                                //Next: 'b'
                            //},
                            //b: {
                                //Type: 'Task',
                                //Resource: 'b',
                                //End: true
                            //}
                        //}
                    //}
                //],
                //End: true
            //}
        //}
    //};
    //t.deepEqual(await readAll([
        //'[a b]'
    //]), definition);
    //t.deepEqual(await readAll([
        //'[a [b]]'
    //]), definition);
    //t.deepEqual(await readAll([
        //'[[a] b]'
    //]), definition);
    //t.deepEqual(await readAll([
        //'[[a] [b]]'
    //]), definition);
    //t.deepEqual(await readAll([
        //'@parallel[:name parallel-1 branches [[a] [b]]]'
    //]), definition);
//});
