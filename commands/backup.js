'use strict';

const request = require('../lib/request');
const utils = require('../lib/utils');

const _ = require('lodash');
const chalk = require('chalk');
const columnify = require('columnify');
const fs = require('fs');

const command = {
    command: 'backup',
    description: 'backup and restore applications on a ContainerShip cluster',
    builder: (yargs) => {
        yargs
            .command('create', 'backup applications on the configured containership cluster', {
                persistence: {
                    description: 'Type of persistence to use [local]',
                    alias: 'p',
                    default: 'local',
                    choices: ['local']
                },
                file: {
                    description: 'Local file to write to',
                    alias: 'f',
                    default: `/tmp/containership.backup.${new Date().valueOf()}`
                }
            }, (argv) => {
                if(argv.persistence === 'local') {
                    request.get('applications', {}, (err, response) => {
                        if(err) {
                            process.stderr.write(`Error writing file to ${argv.file}`);
                            process.exit(1);
                        }

                        fs.writeFile(argv.file, JSON.stringify(response.body), (err) => {
                            if(err) {
                                process.stderr.write(`Error writing file to ${argv.file}`);
                                process.exit(1);
                            }

                            process.stdout.write(`Successfully wrote file to ${argv.file}\n`);
                        });
                    });
                }
            })

        yargs
            .command('restore', 'restore applications from existing backup to a containership cluster', {
                persistence: {
                    description: 'Type of persistence to use [local]',
                    alias: 'p',
                    default: 'local',
                    choices: ['local']
                },
                file: {
                    description: 'Local file to restore from',
                    alias: 'f',
                    required: true
                }
            }, (argv) => {
                if(argv.persistence === 'local') {
                    fs.readFile(argv.file, (err, applications) => {
                        if(err) {
                            process.stderr.write(`Error reading file: ${argv.file}`);
                            process.exit(1);
                        } else {
                            request.post('applications', {}, JSON.parse(applications), (err, response) => {
                                if(err || response.statusCode != 201) {
                                    process.stderr.write('Error restoring applications!');
                                    process.exit(1);
                                } else {
                                    process.stdout.write('Successfully restored applications!\n');
                                }
                            });
                        }
                    });
                }
            })

        yargs.help('h')
        yargs.alias('h', 'help');

        return yargs;
    }
};
module.exports = command;
