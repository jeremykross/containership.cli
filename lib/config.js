'use strict';

const constants = require('./constants');

const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

let CONFIG_PATH = null;

module.exports.initialize = function(configPath, pluginPath) {
    configPath = expandHome(configPath);
    pluginPath = expandHome(pluginPath);
    CONFIG_PATH = configPath;
    const dirname = path.dirname(configPath);

    if (!fs.existsSync(configPath)) {
        mkdirp.sync(dirname);
        fs.writeFileSync(configPath, JSON.stringify({
            "clusters": {},
            "active-cluster": null,
            "plugin-location": pluginPath
        }, null, 2));
    }
}

module.exports.get = function() {
    return require(CONFIG_PATH);
}

module.exports.getActiveCluster = function() {
    const conf = require(CONFIG_PATH);
    const active = conf.activeCluster;

    return conf.clusters[active];
}

module.exports.set = function(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
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
