'use strict';

const _ = require('lodash');
const constants = require('../constants');

const GitHub = require('github');

const AUTHORIZATION_NAME = 'ContainerShip Cloud API';

const github = new GitHub({
    headers: {
        'user-agent': AUTHORIZATION_NAME
    }
});

module.exports.authenticate = function(credentials) {
    github.authenticate({
        type: 'basic',
        username: credentials.username,
        password: credentials.password
    });
}

module.exports.get_user = function(callback) {
    github.users.get({}, callback);
}

module.exports.get_authorizations = function(otp, callback) {
	const request = {
		per_page: 100
	};

	if (otp) {
		request.headers = {
			'x-github-otp': otp
		};
	}

	github.authorization.getAll(request, callback);
}

module.exports.remove_authorization = function(id, otp, callback) {
	const request = { id: id };

	if (otp) {
		request.headers = {
			'x-github-otp': otp
		};
	}

	github.authorization.delete(request, callback);
},

module.exports.authorize = function(otp, callback) {
	const options = {
		scopes: ['user', 'repo'],
		note: AUTHORIZATION_NAME,
		note_url: constants.CLOUD_API_BASE_URL,
		headers: {}
	};

	if (otp) {
		options.headers['X-GitHub-OTP'] = otp;
	}

	// eslint-disable-next-line handle-callback-err
	this.get_authorizations(otp, (err, authorizations) => {
		authorizations = _.keyBy(authorizations, 'note');

		if (_.has(authorizations, AUTHORIZATION_NAME)) {
			this.remove_authorization(authorizations[AUTHORIZATION_NAME].id, otp, (err) => {
				if (err) {
					return callback(err);
				}

                return github.authorization.create(options, callback);
			});
		} else {
            return github.authorization.create(options, callback);
		}
	});
}
