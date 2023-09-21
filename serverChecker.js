const net = require('net');
const async = require('async');
const Server = require('./models/Server');
require('dotenv').config()

const CONCURRENT_LIMIT = 10;

const checkServerStatus = (ip, port) => {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.setTimeout(5000);

        client.connect(port, ip, () => {
            resolve('on');
            client.end();
        });

        client.on('timeout', () => {
            client.destroy();
            resolve('off');
        });

        client.on('error', () => {
            resolve('off');
        });
    });
};

exports.checkAndRecordAllServers = async () => {
    try {
        const servers = await Server.find();

        const tasks = servers.map(server => {
            return async () => {
                try {
                    await checkAndRecordServerStatus(server.ip, server.port);
                } catch (err) {
                    console.error('Error checking/recording server:', err);
                }
            };
        });

        async.parallelLimit(tasks, CONCURRENT_LIMIT, (err) => {
            if (err) {
                console.error('Error:', err);
            }
        });
    } catch (err) {
        console.error('Error fetching servers:', err);
    }
};

const MAX_CHECKS = 5000;

const checkAndRecordServerStatus = async (ip, port) => {
    const status = await checkServerStatus(ip, port);
    
    const update = {
        $push: {
            checks: {
                $each: [{
                    timestamp: new Date(),
                    status: status
                }],
                $slice: -MAX_CHECKS // This keeps only the last 288 checks
            }
        }
    };
    
    await Server.findOneAndUpdate({ ip, port }, update);
};


exports.checkServerStatus = checkServerStatus;
