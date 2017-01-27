'use strict';

const constants = require('./lib/constants');
const configuration = require('./lib/config');

const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

class ContainershipCli {
    constructor(options) {
        this.options = options || {};
        this.options.pluginPath = path.normalize(expandHome(constants.PLUGIN_PATH));
        this.options.pluginModulePath = `${this.options.pluginPath}/node_modules`;
        this.options.cliConfigPath = path.normalize(constants.CLI_CONFIG_PATH);

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

        let executed = false;

        this.plugins.forEach((name) => {
            const req = `${this.options.pluginModulePath}/${name}`;
            const pluginCmd = registerPlugin(req);

            if (pluginCmd === cmd) {
                yargs.argv;
                executed = true;
                return false;
            }
        });

        if (executed) {
            return;
        }

        return this.unknownCommand();
    }

    unknownCommand() {
        this.commands.forEach(cmd => yargs.command(require(`./commands/${cmd}`)));

        this.plugins.forEach((name) => {
            const req = `${this.options.pluginModulePath}/${name}`;
            registerPlugin(req);
        });

        yargs.showHelp('log');
    }
}

function registerPlugin(path) {
    const req = require(path);
    const plugin = typeof req === 'function' ? new req() : req;

    if (plugin.cli !== null) {
        yargs.command(plugin.cli);
        return plugin.cli.command;
    }

    return null;
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
