'use strict';

const request = require('../lib/request');
const util = require('util');
const utils = require('../lib/utils');

const _ = require('lodash');
const chalk = require('chalk');
const columnify = require('columnify');

/*
 * #list
 * #show
 * #edit
 * #delete
 */
const command = {
    command: 'host',
    description: 'list and manipulate hosts running on the configured containership cluster',
    builder: (yargs) => {
        yargs
            .command('list', 'list hosts on the configured cluster', {}, (argv) => {
                return request.get('hosts', {}, (err, response) => {
                    if(err) {
                        process.stderr.write('Could not fetch hosts!');
                        process.exit(1);
                    }

                    const output = Object.keys(response.body).map(key => {
                        const host = response.body[key];

                        return {
                            id: host.id,
                            name: host.host_name,
                            start_time: host.start_time,
                            mode: `${host.mode} ${(host.praetor && host.praetor.leader) ? '*' : ''}`,
                            containers: host.containers ? host.containers.length : 0
                        }
                    });

                    return console.info(columnify(output));
                });
            })

        yargs
            .command('show <host>', 'show requested host information', {}, (argv) => {
                return request.get(`hosts/${argv.host}`, {}, (err, response) => {
                    if(err) {
                        process.stderr.write('Could not fetch host!');
                        process.exit(1);
                    }

                    const host = response.body;
                    const overhead = 32;
                    let used_cpus = 0;
                    let used_memory = 0;

                    const tags = Object.keys(host.tags).map((key) => {
                        const val = host.tags[key];

                        return `\t${key} => ${val}`
                    });

                    const output = {
                        host_name: host.host_name,
                        start_time: host.start_time,
                        mode: host.mode,
                        port: host.port,
                        public_ip: host.address.public,
                        private_ip: host.address.private,
                        tags: tags
                    }

                    if (host.mode === 'leader') {
                        output.controlling_leader = host.praetor.leader;
                    }

                    if (host.mode === 'follower') {
                        host.containers.forEach((container) => {
                            used_cpus += parseFloat(container.cpus);
                            used_memory += parseFloat(container.memory) + overhead;
                        });
                    }

                    const available_cpus = parseFloat(host.cpus) - used_cpus;
                    const available_memory = (parseInt(host.memory) / (1024 * 1024)) - used_memory;

                    output.available_cpus = available_cpus;
                    output.used_cpus = used_cpus;
                    output.available_memory = available_memory;
                    output.used_memory = used_memory;

                    return console.info(columnify(output));
                });
            })

        yargs
            .command('edit <host>', 'edit host', {
                tag: {
                    description: 'Host tag',
                    alias: 't',
                    array: true
                }
            }, (argv) => {
                let options = _.omit(argv, ['h', 'help', '$0', '_']);
                options = parse_update_body(options);

                getHostTags(argv.host, (err, existingTags) => {
                    if (err) {
                        process.stderr.write(`Could not update host ${argv.host}!`);
                        process.exit(1);
                    }

                    options.tags = _.merge(existingTags, options.tags);

                    return request.put(`hosts/${argv.host}`, {}, options, (err, response) => {
                        if(err) {
                            process.stderr.write(`Could not update host ${argv.host}!`);
                            process.exit(1);
                        } else if(response.statusCode != 200) {
                            process.stderr.write(response.body.error);
                            process.exit(1);
                        } else {
                            process.stdout.write(`Successfully updated host ${argv.host}!`);
                        }
                    });
                });
            })

        yargs
            .command('delete <host>', 'delete host', {}, (argv) => {
                return request.delete(`hosts/${argv.host}`, {}, (err, response) => {
                    if(err) {
                        process.stderr.write(`Could not delete host ${argv.host}!`);
                        process.exit(1);
                    } else if(response.statusCode == 404) {
                        process.stderr.write(`Host ${argv.host} does not exist!`);
                        process.exit(1);
                    } else if(response.statusCode == 204) {
                        process.stdout.write(`Successfully deleted host ${argv.host}!`);
                    } else {
                        process.stderr.write(`Could not delete host ${argv.host}!`);
                        process.exit(1);
                    }
                });
            })

        yargs.help('h')
        yargs.alias('h', 'help');

        return yargs;
    }
};
module.exports = command;

function parse_update_body(options) {
    if(_.has(options, 'tag')) {
        options.tags = utils.parse_tags(options.tag);
        delete options.tag;
        delete options.t;
    }

    return options;
}

function getHostTags(host, callback) {
    return request.get(`hosts/${host}`, {}, (err, response) => {
        return callback(err, response.body.tags);
    });
}
