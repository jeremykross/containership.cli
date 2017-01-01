'use strict';

const configuration = require('../lib/config');

const columnify = require('columnify');
const npm = require('npm');
const request = require('request');

const conf = configuration.get();
const pluginLocation = conf['plugin-location'];

if (!pluginLocation) {
    process.stderr.write('You must configure the clients `plugin-location`');
    process.exit(1);
}

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

    yargs
        .command('list', usage, (yargs) => {
            yargs.usage(`list: ${usage}`);
        }, (argv) => {
            return npm.load({
                prefix: pluginLocation,
                'unsafe-perm': true
            }, () => {
                return npm.commands.ls([], { json: true }, (err, data) => {

                    const output = Object.keys(data.dependencies).map((name) => {
                        const plugin = data.dependencies[name];

                        if (name.startsWith('containership.plugin.')) {
                            name = name.substring('containership.plugin.'.length);
                        }

                        return {
                            name: name,
                            version: plugin.version
                        }

                    });

                    if (output.length > 0) {
                        return console.info(columnify(output));
                    } else {
                        process.stdout.write('No plugins installed!');
                    }
                });
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
    const usage = 'Add a plugin';

    yargs
        .command('add <plugin>', usage, (yargs) => {
            yargs.usage(`add <plugin>: ${usage}`);
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

