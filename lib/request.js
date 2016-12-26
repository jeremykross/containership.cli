'use strict';

const configuration = require('./config');
const constants = require('./constants');

const request = require('request');

module.exports.get = function(path, qs, callback) {
    const conf = configuration.get();
    const clusterConf = getAndCheckActiveCluster(conf);

    let options = {
        url: `${clusterConf['api-url']}/${clusterConf['api-version']}/${path}`,
        headers: clusterConf.headers || {},
        method: 'GET',
        qs: qs,
        json: true,
        strictSSL: clusterConf['strict-ssl'] || true
    };

    if (clusterConf['use-cloud']) {
        options = convertToCloudProxy(conf, options, path);
    }

    return request(options, callback);
}

function convertToCloudProxy(conf, options, path) {
    options.url = `${constants.CLOUD_API_BASE_URL}/v2/organizations/${conf.cloud.activeOrganization}/clusters/${conf.activeCluster}/proxy`;

    let original_method = options.method;
    options.method = 'POST';

    options.headers = {
        authorization: `Bearer ${conf.cloud.token}`
    }

    let original_qs = options.qs;
    options.qs = {};

    let original_body = options.json;

    options.json = {
        url: path,
        qs: original_qs,
        method: original_method
    };

    if((original_method == 'POST' || original_method == 'PUT') && !_.isUndefined(original_body)) {
        options.json.data = original_body;
    }

    return options;
}

function getAndCheckActiveCluster(conf) {
    const clusterConf = (conf && conf.clusters[conf.activeCluster]) || configuration.getActiveCluster();

    if (!clusterConf) {
        process.stderr.write('Currently you have no selected an active cluster!');
        process.exit(1);
    }

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
