#!/usr/bin/env node
'use strict';

const { read, readAll, readToStream } = module.exports = require('./lib/reader');

require('streamface').wrap({ readToStream, readAll, module });
