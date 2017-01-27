'use strict';

const csUtils = require('containership.utils');

const constants = {};

constants.DOT_CONTAINERSHIP = csUtils.expandUserPath('~/.containership');
constants.PLUGIN_BASE_PATH = `${constants.DOT_CONTAINERSHIP}/plugins`;
constants.CORE_PLUGIN_PATH = `${constants.PLUGIN_BASE_PATH}/core`;
constants.CLI_PLUGIN_PATH = `${constants.PLUGIN_BASE_PATH}/cli`;
constants.CLI_CONFIG_PATH = `${constants.DOT_CONTAINERSHIP}/cli-v2.json`;
constants.AUTH_API_BASE_URL = 'https://auth.containership.io';
constants.CLOUD_API_BASE_URL = 'https://api.containership.io';

module.exports = constants;
