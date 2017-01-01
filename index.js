'use strict';

const constants = require('./lib/constants');
const configuration = require('./lib/config');

const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

class ContainershipCli {
    constructor(options) {
        this.options = options || {};
        this.options.pluginPath = path.normalize(expandHome(this.options.pluginPath || constants.DEFAULT_PLUGIN_PATH));
        this.options.pluginModulePath = `${this.options.pluginPath}/node_modules`;

        this.options.cliConfigPath = path.normalize(this.options.cliConfigPath || constants.DEFAULT_CLI_CONFIG_PATH);
        configuration.initialize(this.options.cliConfigPath, this.options.pluginPath);

        this.commands = fs.readdirSync(path.normalize('./commands')).map(file => file.substring(0, file.indexOf('.js')));
        this.plugins = fs.existsSync(this.options.pluginModulePath) ? fs.readdirSync(this.options.pluginModulePath) : [];
    }

    run() {
        if (yargs.argv._.length === 0) {
            return this.unknownCommand();
        }

        const cmd = yargs.argv._[0];

        if (this.commands.indexOf(cmd) >= 0) {
            return yargs.command(require(`./commands/${cmd}`)).argv;
        }

        this.plugins.forEach((name) => {
            const req = require(`${this.options.pluginModulePath}/${name}`);
            const plugin = typeof req === 'function' ? new req() : req;

            if (plugin.version === 'v2' && plugin.cli !== null) {
                yargs.command(plugin.cli);

                if (plugin.cli.command === cmd) {
                    yargs.argv;
                    process.exit(0);
                }
            }

        });

        return this.unknownCommand();
    }

    unknownCommand() {
        this.commands.forEach(cmd => yargs.command(require(`./commands/${cmd}`)));

        // plugins would have already been added as we have to instantiate each one to check in the run command

        yargs.showHelp('log');
    }
}

function expandHome(path) {
    if (!path) {
        return path;
    }

    if (path === '~') {
        return process.env.HOME;
    }

    path = path.replace('~/', `${process.env.HOME}/`);

    return path;
}

module.exports = ContainershipCli;
