'use strict';

const constants = require('./constants');

const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

module.exports.get = function() {
    initialize();

    return require(constants.CLI_CONFIG_PATH);
}

module.exports.set = function(config) {
    initialize();

    return fs.writeFileSync(constants.CLI_CONFIG_PATH, JSON.stringify(config, null, 2));
}

module.exports.getActiveCluster = function() {
    initialize();

    const conf = require(constants.CLI_CONFIG_PATH);
    const active = conf.activeCluster;

    return conf.clusters[active];
}

function initialize() {
    if (!fs.existsSync(constants.CORE_PLUGIN_PATH)) {
        mkdirp.sync(constants.CORE_PLUGIN_PATH);
    }

    if (!fs.existsSync(constants.CLI_PLUGIN_PATH)) {
        mkdirp.sync(constants.CLI_PLUGIN_PATH);
    }

    if (!fs.existsSync(constants.CLI_CONFIG_PATH)) {
        fs.writeFileSync(constants.CLI_CONFIG_PATH, JSON.stringify({
            "active-cluster": null,
            "clusters": {},
            "plugins": {
                "core": [],
                "cli": []
            }
        }, null, 2));
    }
}
