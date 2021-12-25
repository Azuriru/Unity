const got = require('got');
const config = require('../../util/config');

module.exports = {
    cron: '0 * * * * *',
    type: 'ping',
    task: async function() {
        try {
            await got(config.SERVICE_URL);
        } catch(e) {}
    },
};