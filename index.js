#!/usr/bin/env node
require('events').captureRejections = true;
const path = require('path');
const Unity = require('./src/Unity.js');
const client = new Unity();

client.loadPluginDir(path.join(__dirname, 'src', 'plugins'));

if (client.commander) {
    client.commander.loadCommandDir(path.join(__dirname, 'src', 'plugins', 'commander', 'commands'));
}

client.login(client.config.TOKEN);

process.on('unhandledRejection', client.unhandledRejection.bind(client));
process.on('SIGINT', client.cleanup.bind(client));
