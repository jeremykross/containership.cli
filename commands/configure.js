'use strict';

const configuration = require('../lib/config');

module.exports = {
    command: 'configure',
    description: 'Set or retrieve cli client configuration options',
    builder: (yargs) => {
        setClusterCommand(yargs);
        useClusterCommand(yargs);

        yargs
            .help('h')
            .alias('h', 'help');
    },
    handler: (argv) => {
        // just return configuration if no options provided
        if (argv._.length === 1) {
            console.log(JSON.stringify(configuration.get(), null, 2));
        }
    }
};

function setClusterCommand(yargs) {
    const usage = 'Set client configuration options';

    yargs
        .command('set <cluster>', usage, (yargs) => {
            yargs.usage(`set [cluster]: ${usage}`);
        }, (argv) => {
            const conf = configuration.get();
            const clusterName = argv.cluster;

            if (!clusterName) {
                return console.info('You must define a name for your cli cluster configuration');
            }

            if (argv['plugin-location']) {
                conf['plugin-location'] = argv['plugin-location'];
            }

            const cluster = conf.clusters[clusterName] || {};

            if (argv['api-url']) {
                cluster['api-url'] = argv['api-url'];
            }

            if (argv['api-version']) {
                cluster['api-version'] = argv['api-version'];
            }

            if (argv['strict-ssl']) {
                cluster['strict-ssl'] = argv['strict-ssl'];
            }

            if (Object.keys(cluster).length > 0) {
                cluster['api-version'] = cluster['api-version'] || 'v1';
                conf.clusters[clusterName] = cluster;
            }

            configuration.set(conf);

            if (argv.cluster) {
                if (!conf.clusters[argv.cluster]) {
                    return console.info(`The cluster has not yet been configured: [${argv.cluster}]`);
                }

                return console.info(JSON.stringify(conf.clusters[argv.cluster], null, 2));
            } else {
                return console.info(JSON.stringify(conf, null, 2));
            }
        });
}

function useClusterCommand(yargs) {
    const usage = 'Set the currently active cluster in the cli configuration';

    yargs
        .command('use <cluster>', usage, (yargs) => {
            yargs.usage(`use [cluster]: ${usage}`);
        }, (argv) => {
            const conf = configuration.get();
            const clusterName = argv.cluster;
            conf.activeCluster = clusterName;
            configuration.set(conf);

            return console.info(JSON.stringify(conf.clusters[clusterName] || {}, null, 2));
        })
}
