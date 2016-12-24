'use strict';

const yargs = require('yargs');

yargs.command('test', 'test command', () => {
    console.info('i ran the test command');
});
yargs.argv

module.exports = yargs;
