'use strict';

const constants = {};

constants.CONFIG_PATH = '~/.containership';
constants.PLUGIN_PATH = `${constants.CONFIG_PATH}/plugins`;
constants.CLI_CONFIG_PATH = `${constants.CONFIG_PATH}/cli-config-v2.json`;
constants.AUTH_API_BASE_URL = 'https://auth.containership.io';
constants.CLOUD_API_BASE_URL = 'https://api.containership.io';

module.exports = constants;
