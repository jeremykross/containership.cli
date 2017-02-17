'use strict';

const configuration = require('../lib/config');
const constants = require('../lib/constants');

const _ = require('lodash');
const async = require('async');
const columnify = require('columnify');
const csUtils = require('containership.utils');
const npm = require('npm');
const request = require('request');

const conf = configuration.get();

// cs plugin list
// cs plugin add --core || --cli
// cs plugin upgrade
// cs plugin search
// cs plugin remove

/*
 *
 * {
 *  "plugins" {
 *      "containership.cloud.plugin": {
 *          "name": "cloud",
 *          "has_cli": true,
 *          "has_core": true,
 *          "version": 1.0.2
 *      }
 *  }
 * }
 *
 */

module.exports = {
    command: 'plugin',
    description: 'List and manipulate plugins for ContainerShip',
    builder: (yargs) => {
        listCommand(yargs);
        searchCommand(yargs);
        addCommand(yargs);
        updateCommand(yargs);
        removeCommand(yargs);

        yargs
            .help('h')
            .alias('h', 'help');
    },
    handler: (argv) => {
        // just return configuration if no options provided
        if (argv._.length === 1) {
            console.log(JSON.stringify(configuration.get(), null, 2));
        }
    }
};

function listCommand(yargs) {
    const usage = 'List available plugins';

    function retrievePlugins(path) {
        return function(cb) {
            return npm.load({
                loglevel: 'silent',
                force: true,
                prefix: path,
                'unsafe-perm': true
            }, () => {
                return npm.commands.ls([], { json: true }, (err, data) => {
                    const output = Object.keys(data.dependencies).reduce((accumulator, name) => {
                        const plugin = data.dependencies[name];

                        if (!csUtils.hasAllKeys(plugin, 'containership.plugin.name')) {
                            console.error(`Error: Module ${name} does not have the 'containership' key in the package.json`);
                            console.error('TODO: See blah blah blah docs link for more information');
                            return accumulator;
                        }

                        accumulator[plugin.containership.plugin.name] = {
                            name: name,
                            version: plugin.version
                        };

                        return accumulator;
                    }, {});

                    return cb(null, output);
                });
            });
        }
    }

    yargs
        .command('list', usage, (yargs) => {
            yargs.usage(`list: ${usage}`);
        }, (argv) => {
            return async.parallel({
                cli: retrievePlugins(constants.CLI_PLUGIN_PATH),
                core: retrievePlugins(constants.CORE_PLUGIN_PATH)
            }, (err, results) => {
                if (err) {
                    return console.error(err);
                }

                console.info('CLI Plugins');

                if (Object.keys(results.cli).length) {
                    console.info(`${columnify(results.cli)}\n`);
                } else {
                    console.info('There are currently no plugins installed\n');
                }

                console.info('CORE Plugins');

                if (Object.keys(results.core).length) {
                    console.info(`${columnify(results.core)}\n`);
                } else {
                    console.info('There are currently no plugins installed\n');
                }

            });
        });
}

function searchCommand(yargs) {
    const usage = 'Search plugins';

    yargs
        .command('search', usage, (yargs) => {
            yargs.usage(`search: ${usage}`);
        }, (argv) => {
            return request({ url: 'http://plugins.containership.io', json: true }, (err, response) => {
                if (err || response.statusCode !== 200) {
                    process.stderr.write('Failed to search for plugins');
                    process.exit(1);
                }

                const output = Object.keys(response.body).map((name) => {
                    const plugin = response.body[name];

                    return {
                        name: name,
                        source: plugin.source,
                        description: plugin.description
                    }
                });

                return console.info(columnify(output));
            });
        });
}

function addCommand(yargs) {
    yargs
        .command('add <plugin>', usage, {
            'core': {
                description: 'Environment variable for application',
                default: true,
                alias: 'e'
            },
        }, (argv) => {
            return npm.load({
                loglevel: 'silent',
                force: true,
                prefix: `${pluginLocation}`,
                'unsafe-perm': true
            }, () => {
                return request({ url: 'http://plugins.containership.io', json: true }, (err, response) => {
                    if (err || response.statusCode !== 200) {
                        process.stderr.write('Failed to search for plugins');
                        process.exit(1);
                    }

                    let authed_plugin = null;

                    Object.keys(response.body).forEach((key) => {
                        if (argv.plugin === key) {
                            authed_plugin = response.body[key];
                        }
                    });

                    if (authed_plugin === null) {
                        process.stderr.write('Not an authenticated ContainerShip plugin. See https://plugins.containership.io for a list of valid plugins');
                        process.exit(1);
                    }

                    return npm.commands.ls([], { json: true }, (err, data) => {
                        if (err) {
                            process.stderr.write('Failed to add plugin!');
                            process.exit(1);
                        }

                        if (Object.keys(data.dependencies).indexOf(authed_plugin.source) !== -1) {
                            process.stderr.write(`The ${argv.plugin} plugin already exists! Did you mean to run 'plugin update'?`);
                            process.exit(1);
                        }

                        npm.commands.install([authed_plugin.source], (err) => {
                            if (err) {
                                process.stderr.write('Failed to add plugin!');
                                process.exit(1);
                            }

                            process.stdout.write(`Successfully installed the ${argv.plugin} plugin`);
                        });
                    });
                });
            });
        });
}

function updateCommand(yargs) {
    const usage = 'Update a plugin';

    yargs
        .command('update <plugin>', usage, (yargs) => {
            yargs.usage(`update <plugin>: ${usage}`);
        }, (argv) => {
            return npm.load({
                loglevel: 'silent',
                force: true,
                prefix: `${pluginLocation}`,
                'unsafe-perm': true
            }, () => {
                return request({ url: 'http://plugins.containership.io', json: true }, (err, response) => {
                    if (err || response.statusCode !== 200) {
                        process.stderr.write('Failed to search for plugins');
                        process.exit(1);
                    }

                    let authed_plugin = null;

                    Object.keys(response.body).forEach((key) => {
                        if (argv.plugin === key) {
                            authed_plugin = response.body[key];
                        }
                    });

                    if (authed_plugin === null) {
                        process.stderr.write('Not an authenticated ContainerShip plugin. See https://plugins.containership.io for a list of valid plugins');
                        process.exit(1);
                    }

                    return npm.commands.ls([], { json: true }, (err, data) => {
                        if (err) {
                            process.stderr.write('Failed to update plugin!');
                            process.exit(1);
                        }

                        if (Object.keys(data.dependencies).indexOf(authed_plugin.source) === -1) {
                            process.stderr.write(`The ${argv.plugin} plugin does not exist! Did you mean to run 'plugin add'?`);
                            process.exit(1);
                        }

                        npm.commands.update([authed_plugin.source], (err) => {
                            if (err) {
                                process.stderr.write('Failed to update plugin!');
                                process.exit(1);
                            }

                            process.stdout.write(`Successfully updated the ${argv.plugin} plugin`);
                        });
                    });
                });
            });
        });
}

function removeCommand(yargs) {
    const usage = 'Remove a plugin';

    yargs
        .command('remove <plugin>', usage, (yargs) => {
            yargs.usage(`remove <plugin>: ${usage}`);
        }, (argv) => {
            return npm.load({
                loglevel: 'silent',
                force: true,
                prefix: `${pluginLocation}`,
                'unsafe-perm': true
            }, () => {
                return request({ url: 'http://plugins.containership.io', json: true }, (err, response) => {
                    if (err || response.statusCode !== 200) {
                        process.stderr.write('Failed to search for plugins');
                        process.exit(1);
                    }

                    let authed_plugin = null;

                    Object.keys(response.body).forEach((key) => {
                        if (argv.plugin === key) {
                            authed_plugin = response.body[key];
                        }
                    });

                    if (authed_plugin === null) {
                        process.stderr.write('Not an authenticated ContainerShip plugin. See https://plugins.containership.io for a list of valid plugins');
                        process.exit(1);
                    }

                    return npm.commands.ls([], { json: true }, (err, data) => {
                        if (err) {
                            process.stderr.write('Failed to remove plugin!');
                            process.exit(1);
                        }

                        if (Object.keys(data.dependencies).indexOf(authed_plugin.source) === -1) {
                            process.stderr.write(`The ${argv.plugin} plugin does not exist!`);
                            process.exit(1);
                        }

                        npm.commands.remove([authed_plugin.source], (err) => {
                            if (err) {
                                process.stderr.write('Failed to remove plugin!');
                                process.exit(1);
                            }

                            process.stdout.write(`Successfully removed the ${argv.plugin} plugin`);
                        });
                    });
                });
            });
        });
}

