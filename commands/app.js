'use strict';

const request = require('../lib/request');

const chalk = require('chalk');
const columnify = require('columnify');

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
                console.log('showing app: ' + argv.app);
            })
            .help('h')
            .alias('h', 'help');

        return yargs;
    }
};
module.exports = command;
