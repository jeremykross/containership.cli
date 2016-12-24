'use strict';

const configuration = require('../lib/config');
const constants = require('../lib/constants');
const github = require('../lib/integrations/github');

const _ = require('lodash');
const async = require('async');
const chalk = require('chalk');
const columnify = require('columnify');
const prmpt = require('prompt');
const request = require('request');

prmpt.message = '';
prmpt.delimiter = chalk.white(':');

const userPassPrompt = [{
    name: 'username',
    description: 'Your username or email',
    type: 'string',
    required: true
}, {
    name: 'password',
    description: 'Your password',
    type: 'string',
    required: true,
    hidden: true,
    replace: '*'
}];

/*
##cscli cloud org list
##cscli cloud org show
##cscli cloud org use
##cscli cloud login github
##cscli cloud logout
#cscli cloud cluster list
#*cscli cloud cluster show
#cscli cloud cluster use
cscli cloud login bitbucket
*/

const command = {
    command: 'cloud',
    description: 'list and manipulate cloudlications running on the configured containership cluster',
    builder: (yargs) => {
        commandLogin(yargs);
        commandLogout(yargs);
        commandOrganization(yargs);
        commandCluster(yargs);

        return yargs;
    }
};
module.exports = command;

function commandLogin(yargs) {
    yargs.command('login <scm>', 'login with the provided <scm>', {}, (argv) => {
        const scm = argv.scm;

        if (scm === 'github') {
            console.info('Please enter your github credentials to login:');

            async.waterfall([
                (callback) => prmpt.get(userPassPrompt, callback),
                (credentials, callback) => {
                    github.authenticate(credentials);
                    return github.get_user((err) => {
                        if (err && err.headers && err.headers['x-github-otp']) {
                            return callback(null, { needsOtp: true });
                        } else if (err) {
                            return callback(err);
                        } else {
                            return callback(null, { needsOtp: false });
                        }
                    })
                },
                (result, callback) => {
                    if (result.needsOtp) {
                        prmpt.get([{
                            name: 'otp',
                            description: 'Authentication Code',
                            required: true
                        }], callback);
                    } else {
                        return callback();
                    }
                },
                (credentials, callback) => github.authorize(credentials && credentials.otp, callback),
                (auth, callback) => {
                        console.log('waterfall auth');
                    console.log(auth);
                    authenticate(auth, scm, callback)
                }
            ], (err, results) => {
                if (err) {
                    console.error(err);
                    console.error('Failed to login with github');
                    process.exit(1);
                }

                console.info(chalk.green('\nSuccessfully logged in!\n'));
            });
        }
        else if (scm === 'bitbucket') {
            console.info('Please enter your bitbucket credentials to login:');
            prmpt.get(userPassPrompt, (err, results) => {
                console.log(err);
                console.log(results);
            });

            authenticate(credentials, scm, (err) => {
                if (err) {
                    process.stderr.write(`${err.message}\n`);
                    process.exit(1);
                } else {
                    process.stdout.write(colors.green('\nSuccessfully logged in!\n'));
                }
            });
        }
    })
}

function commandLogout(yargs) {
    yargs.command('logout', 'login with the provided <scm>', {}, (argv) => {
        const conf = configuration.get();

        if (conf.cloud) {
            delete conf.cloud.token;
        }

        configuration.set(conf);
        console.log(chalk.green('Sucessfully logged out'));
    })
}

function authenticate(auth, scm, callback) {
	const request_options = {
		url: `${constants.AUTH_API_BASE_URL}/v1/authenticate/${scm}/authorization`,
		method: 'POST'
	};

	if(scm === 'github') {
		request_options.json = {
			authorization: auth.token
		};
	} else if(scm === 'bitbucket') {
		request_options.json = auth;
	}

	return request(request_options, (err, response) => {
		if (err || response.statusCode != 201) {
			return callback(new Error('Error generating ContainerShip auth token'));
		} else {
            const conf = configuration.get();

            if (!conf.cloud) {
                conf.cloud = {};
            }

            conf.cloud.token = response.body.token;
            configuration.set(conf);

			return callback();
		}
	});
}

function commandOrganization(yargs) {
    yargs.command('org', 'List and use organizations from your cloud account', (yargs) => {
        yargs.command('list', 'list organizations from your cloud account', {}, (argv) => {
            const conf = configuration.get();

            if (!conf.cloud.token) {
                return console.info('You must login with `cs cloud login <scm>` before attempting to use the org command');
            }

			const options = {
				url: `${constants.CLOUD_API_BASE_URL}/v2/account`,
				method: 'GET',
				json: true,
				headers: {
                    authorization: `Bearer ${conf.cloud.token}`
                }
			};

			request(options, (err, response) => {
				if(err || response.statusCode != 200) {
                    console.log(response.body);
					process.stderr.write('Could not fetch organizations!');
					process.exit(1);
				}

                const output = response.body.organizations.map(org => {
                    org = {
                        id: org.id,
                        org: org.name
                    }

                    const activeOrg = conf.cloud ? conf.cloud.activeOrganization : null;

                    if (org.id === activeOrg) {
                        org.id = `*${org.id}`;
                    }

                    return org;
                });

                console.log(columnify(output));
            });
        });

        yargs.command('show <orgId>', 'show organization from your cloud account', {}, (argv) => {
            const conf = configuration.get();

            if (!conf.cloud.token) {
                return console.info('You must login with `cs cloud login <scm>` before attempting to use the org command');
            }

			const options = {
				url: `${constants.CLOUD_API_BASE_URL}/v2/organizations/${argv.orgId}`,
				method: 'GET',
				json: true,
				headers: {
                    authorization: `Bearer ${conf.cloud.token}`
                }
			};

			request(options, (err, response) => {
				if(err || response.statusCode != 200) {
                    console.log(response.body);
					process.stderr.write('Could not fetch organizations!');
					process.exit(1);
				}

                const org = response.body;

                console.log(columnify({
                    id: argv.orgId,
                    name: org.description,
                    tier: org.billing.tier,
                    locked: org.locked,
                    created_at: org.createdAt
                }));
            });
        });

        yargs.command('use <orgId>', 'use organizations from your cloud account', {}, (argv) => {
            const conf = configuration.get();

            if (!conf.cloud.token) {
                return console.info('You must login with `cs cloud login <scm>` before attempting to use the org command');
            }

			const options = {
				url: `${constants.CLOUD_API_BASE_URL}/v2/organizations/${argv.orgId}`,
				method: 'GET',
				json: true,
				headers: {
                    authorization: `Bearer ${conf.cloud.token}`
                }
			};

			request(options, (err, response) => {
				if(err || response.statusCode != 200) {
                    console.log(response.body);
					process.stderr.write('Could not fetch organizations!');
					process.exit(1);
				}

                const conf = configuration.get();

                if (!conf.cloud) {
                    conf.cloud = {};
                }

                conf.cloud.activeOrganization = argv.orgId;
                configuration.set(conf);

                const org = response.body;

                console.log(columnify({
                    id: argv.orgId,
                    name: org.description,
                    tier: org.billing.tier,
                    locked: org.locked,
                    created_at: org.createdAt
                }));
            });
        });
    });
}

function commandCluster(yargs) {
    yargs.command('cluster', 'List and use clusters from your cloud account', (yargs) => {
        yargs.command('list', 'list clusters from your cloud account', {}, (argv) => {
            const conf = configuration.get();

            if (!conf.cloud.token) {
                return console.info('You must login with `cs cloud login <scm>` before attempting to use the cloud cluster command');
            }

            if (!conf.cloud.activeOrganization) {
                return console.info('You have to activate a organization with the `cs cloud use org <orgId>` command');
            }

			const options = {
				url: `${constants.CLOUD_API_BASE_URL}/v2/organizations/${conf.cloud.activeOrganization}/clusters`,
				method: 'GET',
				json: true,
				headers: {
                    authorization: `Bearer ${conf.cloud.token}`
                }
			};

			request(options, (err, response) => {
				if(err || response.statusCode != 200) {
                    console.log(response.body);
					process.stderr.write('Could not fetch organizations!');
					process.exit(1);
				}

                const output = response.body.map(cluster => {
                    return {
                        id: cluster.id,
                        name: cluster.name,
                        provider_name: cluster['provider_name'],
                        created_at: cluster.createdAt
                    }
                });

                console.log(columnify(output));
            });
        });

        yargs.command('show <clusterId>', 'show cluster from your cloud account', {}, (argv) => {
            const conf = configuration.get();

            if (!conf.cloud.token) {
                return console.info('You must login with `cs cloud login <scm>` before attempting to use the cloud cluster command');
            }

            if (!conf.cloud.activeOrganization) {
                return console.info('You have to activate a organization with the `cs cloud use org <orgId>` command');
            }

			const options = {
				url: `${constants.CLOUD_API_BASE_URL}/v2/organizations/${conf.cloud.activeOrganization}/clusters/${argv.clusterId}`,
				method: 'GET',
				json: true,
				headers: {
                    authorization: `Bearer ${conf.cloud.token}`
                }
			};

			request(options, (err, response) => {
				if(err || response.statusCode != 200) {
                    console.log(response.body);
					process.stderr.write('Could not fetch organizations!');
					process.exit(1);
				}

                const cluster = response.body;

                console.log(columnify({
                    id: cluster.id,
                    name: cluster.name,
                    provider_name: cluster['provider_name'],
                    created_at: cluster.createdAt
                }));
            });
        });

        yargs.command('use <clusterId>', 'use clusters from your cloud account', {}, (argv) => {
            const conf = configuration.get();

            if (!conf.cloud.token) {
                return console.info('You must login with `cs cloud login <scm>` before attempting to use the cloud cluster command');
            }

            if (!conf.cloud.activeOrganization) {
                return console.info('You have to activate a organization with the `cs cloud use org <orgId>` command');
            }

			const options = {
				url: `${constants.CLOUD_API_BASE_URL}/v2/organizations/${conf.cloud.activeOrganization}/clusters/${argv.clusterId}`,
				method: 'GET',
				json: true,
				headers: {
                    authorization: `Bearer ${conf.cloud.token}`
                }
			};

			request(options, (err, response) => {
				if(err || response.statusCode != 200) {
                    console.log(response.body);
					process.stderr.write('Could not fetch clusters!');
					process.exit(1);
				}

                const conf = configuration.get();
                const cluster = response.body;

                if (!conf.clusters) {
                    conf.clusters = {};
                }

                conf.clusters[argv.clusterId] = {
                    'api-url': `${cluster.ipaddress}:8080`,
                    'api-version': cluster['api_version'],
                    'use-cloud': true
                };

                conf.activeCluster = argv.clusterId;
                configuration.set(conf);

                console.log(columnify({
                    id: cluster.id,
                    name: cluster.name,
                    provider_name: cluster['provider_name'],
                    created_at: cluster.createdAt
                }));
            });
        });
    });
}
