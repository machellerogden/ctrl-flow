#!/usr/bin/env node
'use strict';

const { readToStream } = require('./lib/reader');

if (require.main === module) {
    process.stdin.isTTY
        ? process.argv[2] == null
            ? require('./lib/repl').start()
            : readToStream(process.argv.slice(2).join(' ')).pipe(process.stdout)
        : readToStream(process.stdin).pipe(process.stdout);
}
