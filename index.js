'use strict';

const constants = require('./lib/constants');
const configuration = require('./lib/config');

const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const _ = require('lodash');

class ContainershipCli {
    constructor(options) {
        this.options = options || {};

        this.commands = fs.readdirSync(`${__dirname}/commands`).map(file => path.basename(file, '.js'));
        this.plugins = configuration.get().plugins.cli;
    }

    run() {
        if (yargs.argv._.length === 0) {
            return this.unknownCommand();
        }

        const cmd = yargs.argv._[0];

        if (this.commands.indexOf(cmd) >= 0) {
            return yargs.command(require(`./commands/${cmd}`)).argv;
        }

        const plugins = configuration.get().plugins.cli;

        if (plugins[cmd]) {
            registerPlugin(plugins[cmd].path);
            return yargs.argv;
        }

        return this.unknownCommand();
    }

    unknownCommand() {
        this.commands.forEach(cmd => yargs.command(require(`./commands/${cmd}`)));

        _.each(_.values(this.plugins), (plugin) => registerPlugin(plugin.path));

        yargs.showHelp('log');
    }
}

function registerPlugin(path) {
    const req = require(path);
    const plugin = typeof req === 'function' ? new req() : req;

    if (plugin.cli !== null) {
        yargs.command(plugin.cli);
    }
}

module.exports = ContainershipCli;
