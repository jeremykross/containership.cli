'use strict';

const constants = require('./lib/constants');
const configuration = require('./lib/config');

const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

class ContainershipCli {
    constructor(options) {
        this.options = options || {};
        this.options.pluginPath = path.normalize(this.options.pluginPath || constants.DEFAULT_PLUGIN_PATH);

        this.options.cliConfigPath = path.normalize(this.options.cliConfigPath || constants.DEFAULT_CLI_CONFIG_PATH);
        configuration.initialize(this.options.cliConfigPath, this.options.pluginPath);

        this.commands = fs.readdirSync(path.normalize('./commands')).map(file => file.substring(0, file.indexOf('.js')));
        this.plugins = fs.existsSync(this.options.pluginPath) ? fs.readdirSync(this.options.pluginPath) : [];
    }

    run() {
        if (yargs.argv._.length === 0) {
            return this.unknownCommand();
        }

        const cmd = yargs.argv._[0];

        if (this.commands.indexOf(cmd) >= 0) {
            return yargs.command(require(`./commands/${cmd}`)).argv;
        }

        // todo - check if it is command of an installed plugin, load, and execute

        return this.unknownCommand();
    }

    unknownCommand() {
        this.commands.forEach(cmd => yargs.command(require(`./commands/${cmd}`)));

        // todo: load all plugin cli commands before showing help

        yargs.showHelp('log');
    }
}

module.exports = ContainershipCli;
