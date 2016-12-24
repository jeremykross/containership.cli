'use strict';

const configuration = require('./config');

const request = require('request');

module.exports.get = function(path, qs, callback) {
    const clusterConf = getAndCheckActiveCluster();

    const options = {
        url: `${clusterConf['api-url']}/${clusterConf['api-version']}/${path}`,
        headers: clusterConf.headers || {},
        method: 'GET',
        qs: qs,
        json: true,
        strictSSL: clusterConf['strict-ssl'] || true
    };

    // todo: check config for cloud info, modify options

    return request(options, callback);
}

function getAndCheckActiveCluster() {
    const clusterConf = configuration.getActiveCluster();

    if (!clusterConf['api-url']) {
        process.stderr.write('Active cluster must contain an `api-url`!');
        process.exit(1);
    }

    if (!clusterConf['api-version']) {
        process.stderr.write('Active cluster must contain an `api-version`!');
        process.exit(1);
    }

    return clusterConf;
}
