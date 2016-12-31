'use strict';

const configuration = require('../lib/config');

const columnify = require('columnify');
const npm = require('npm');

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
        addCommand(yargs);

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

                        console.log(data);
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

function addCommand(yargs) {
    const usage = 'Add a plugin';

    yargs
        .command('add <plugin>', usage, (yargs) => {
            yargs.usage(`add <plugin>: ${usage}`);
        }, (argv) => {

        });
}

