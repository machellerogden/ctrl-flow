'use strict';

const { nil } = require('./util');

function branch(StartAt, States) {
    return {
        StartAt,
        States
    };
}

function task(Resource) {
    return {
        Type: 'Task',
        Resource
    };
}

function pass(Parameters) {
    return {
        Type: 'Pass',
        Parameters: Parameters ? JSON.parse(Parameters) : nil
    };
}

function succeed() {
    return {
        Type: 'Succeed'
    };
}

function fail(Error, Cause) {
    return {
        Type: 'Fail',
        Error,
        Cause
    };
}

function choice(Choices) {
    return {
        Type: 'Choice',
        Choices: JSON.parse(Choices)
    };
}

function parallel(Branches) {
    return {
        Type: 'Parallel',
        Branches: JSON.parse(Branches)
    };
}

function wait(Seconds) {
    return {
        Type: 'Wait',
        Seconds: parseInt(Seconds, 10)
    }
}

module.exports = {
    branch,
    task,
    pass,
    succeed,
    fail,
    choice,
    parallel,
    wait
};
