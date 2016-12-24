'use strict';

const constants = {};

constants.DEFAULT_CONFIG_PATH = '~/.containership';
constants.DEFAULT_PLUGIN_PATH = `${constants.DEFAULT_CONFIG_PATH}/plugins`;
constants.DEFAULT_CLI_CONFIG_PATH = `${constants.DEFAULT_CONFIG_PATH}/cli-config-v2.json`;
constants.AUTH_API_BASE_URL = 'https://auth.containership.io';
constants.CLOUD_API_BASE_URL = 'https://api.containership.io';

module.exports = constants;
