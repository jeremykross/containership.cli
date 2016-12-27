'use strict';

const request = require('../lib/request');
const utils = require('../lib/utils');

const _ = require('lodash');
const chalk = require('chalk');
const columnify = require('columnify');

/*
 * #list
 * #show
 * #create
 * #delete
 * #update
 * scale-up
 * scale-down
 * logs
 * create-from-file
 */
const command = {
    command: 'app',
    description: 'list and manipulate applications running on the configured containership cluster',
    builder: (yargs) => {
        yargs
            .command('list', 'list applications on the configured cluster', {}, (argv) => {
                return request.get('applications', {}, (err, response) => {
                    if(err) {
                        process.stderr.write('Could not fetch applications!');
                        process.exit(1);
                    }

                    const output = Object.keys(response.body).map(key => {
                        const app = response.body[key];
                        const loaded_containers = app.containers.reduce((accumulator, container) => {
                            if (container.status === 'loaded') {
                                accumulator++;
                            }

                            return accumulator;
                        }, 0);

                        return {
                            id: app.id,
                            image: app.image,
                            command: app.command,
                            cpus: app.cpus,
                            memory: app.memory,
                            containers: `${loaded_containers || 0}/${app.containers.length}`
                        }
                    });

                    return console.info(columnify(output));
                });
            })
            .help('h')
            .alias('h', 'help');

        yargs
            .command('show <app>', 'show requested application information', {}, (argv) => {
                return request.get(`applications/${argv.app}`, {}, (err, response) => {
                    if(err) {
                        process.stderr.write('Could not fetch applications!');
                        process.exit(1);
                    }

                    const app = response.body;

                    const output = {
                        engine: app.engine,
                        image: app.image,
                        command: app.command,
                        cpus: app.cpus,
                        memory: app.memory,
                        network_mode: app.network_mode,
                        discovery_port: app.discovery_port,
                        container_port: app.container_port
                    }

                    return console.info(columnify(output));
                });
            })
            .help('h')
            .alias('h', 'help');

        yargs
            .command('create <app>', 'create application', application_options, (argv) => {
                let options = _.omit(argv, ['h', 'help', '$0', '_']);
                options = parse_update_body(options);

                return request.post(`applications/${argv.app}`, {}, options, (err, response) => {
                    if(err) {
                        process.stderr.write(`Could not create application ${argv.app}!`);
                        process.exit(1);
                    } else if(response.statusCode != 200) {
                        process.stderr.write(response.body.error);
                        process.exit(1);
                    } else {
                        process.stdout.write(`Successfully created application ${argv.app}!`);
                    }
                });
            })
            .help('h')
            .alias('h', 'help');

        yargs
            .command('edit <app>', 'edit application', application_options, (argv) => {
                let options = _.omit(argv, ['h', 'help', '$0', '_']);
                options = parse_update_body(options);

                return request.put(`applications/${argv.app}`, {}, options, (err, response) => {
                    if(err) {
                        process.stderr.write(`Could not update application ${argv.app}!`);
                        process.exit(1);
                    } else if(response.statusCode != 200) {
                        process.stderr.write(response.body.error);
                        process.exit(1);
                    } else {
                        process.stdout.write(`Successfully updated application ${argv.app}!`);
                    }
                });
            })
            .help('h')
            .alias('h', 'help');

        yargs
            .command('delete <app>', 'delete application', {}, (argv) => {
                return request.delete(`applications/${argv.app}`, {}, (err, response) => {
                    if(err) {
                        process.stderr.write(`Could not delete application ${argv.app}!`);
                        process.exit(1);
                    } else if(response.statusCode == 404) {
                        process.stderr.write(`Application ${argv.app} does not exist!`);
                        process.exit(1);
                    } else if(response.statusCode == 204) {
                        process.stdout.write(`Successfully deleted application ${argv.app}!`);
                    } else {
                        process.stderr.write(`Could not delete application ${argv.app}!`);
                        process.exit(1);
                    }
                });
            })
            .help('h')
            .alias('h', 'help');

        yargs
            .command('scale-up <app>', 'scale up application containers', {
                count: {
                    description: 'number of containers to scale application up by',
                    alias: 'c',
                    default: 1
                }
            }, (argv) => {
                return request.post(`applications/${argv.app}/containers`, { count: argv.count }, null, (err, response) => {
                    if(err) {
                        process.stderr.write(`Could not scale up application ${argv.app}!`);
                        process.exit(1);
                    } else if(response.statusCode == 404) {
                        process.stderr.write(`Application ${argv.app} does not exist!`);
                        process.exit(1);
                    } else if(response.statusCode != 201) {
                        process.stderr.write(response.body.error);
                        process.exit(1);
                    } else {
                        process.stdout.write(`Successfully scaled up application ${argv.app}!`);
                    }
                });
            })
            .help('h')
            .alias('h', 'help');

        yargs
            .command('scale-down <app>', 'scale down applicationc containers', {
                count: {
                    description: 'number of containers to scale application down by',
                    alias: 'c',
                    default: 1
                }
            }, (argv) => {
                return request.delete(`applications/${argv.app}/containers`, { count: argv.count }, (err, response) => {
                    if(err) {
                        process.stderr.write(`Could not scale down application ${argv.app}!`);
                        process.exit(1);
                    } else if(response.statusCode == 404) {
                        process.stderr.write(`Application ${argv.app} does not exist!`);
                        process.exit(1);
                    } else if(response.statusCode != 204) {
                        process.stderr.write(response.body.error);
                        process.exit(1);
                    } else {
                        process.stdout.write(`Successfully scaled down application ${argv.app}!`);
                    }
                });
            })
            .help('h')
            .alias('h', 'help');

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

    if(_.has(options, 'volume')) {
        options.volumes = utils.parse_volumes(options.volume);
        delete options.volume;
        delete options.b;
    }

    if(_.has(options, 'env-var')) {
        options.env_vars = utils.parse_tags(options['env-var']);
        delete options['env-var'];
        delete options.e;
    }

    if(_.has(options, 'network-mode')) {
        options.network_mode = options['network-mode'];
        delete options['network-mode'];
    }

    if(_.has(options, 'container-port')) {
        options.container_port = options['container-port'];
        delete options['container-port'];
    }

    return options;
}

const application_options = {
    engine: {
        description: 'Engine used to start application',
        alias: 'x'
    },
    image: {
        description: 'Application image',
        alias: 'i'
    },
    'env-var': {
        array: true,
        description: 'Environment variable for application',
        alias: 'e'
    },
    'network-mode': {
        description: 'Application network mode',
        alias: 'n'
    },
    'container-port': {
        description: 'Port application must listen on',
        alias: 'p'
    },
    command: {
        description: 'Application start command',
        alias: 's'
    },
    volume: {
        description: 'Volume to bind-mount for application',
        array: true,
        alias: 'b'
    },
    tag: {
        description: 'Tag to add to application',
        array: true,
        alias: 't'
    },
    cpus: {
        description: 'CPUs allocated to application',
        alias: 'c'
    },
    memory: {
        description: 'Memory (mb) allocated to application',
        alias: 'm'
    },
    privileged: {
        description: 'Run application containers in privileged mode',
        boolean: true
    },
    respawn: {
        description: 'Respawn application containers when they die',
        boolean: true
    }
};
