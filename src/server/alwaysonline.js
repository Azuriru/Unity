
const got = require('got');
const config = require('../util/config');
const { CronJob } = require('cron');

const alwaysonline = {
    cron: '0 30 0 1,16 * *',
    type: 'alwaysonline',
    getIds: async function(appname, token) {
        const first = await got(`https://api.heroku.com/teams/apps/${appname}`, {
            json: true,
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.heroku+json; version=3'
            }
        });
        const second = await got(`https://api.heroku.com/apps/${first.body.id}/formation`, {
            json: true,
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.heroku+json; version=3'
            }
        });
        return [second.body[0].app.id, second.body[0].id];
    },
    scale: async function(ids, num, token) {
        return await got.patch(`https://api.heroku.com/apps/${ids[0]}/formation/${ids[1]}`, {
            form: true,
            body: {
                quantity: num,
                size: 'Free',
                type: 'web'
            },
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.heroku+json; version=3'
            }
        });
    },
    task: async function() {
        const [
            app,
            backup
        ] = await Promise.all([
            this.getIds(config.APP_NAME, config.HEROKU_TOKEN),
            this.getIds(config.BACKUP_APP_NAME, config.BACKUP_HEROKU_TOKEN)
        ]),
        current = config.IS_BACKUP ? backup : app,
        other = config.IS_BACKUP ? app : backup,
        currentToken = config.IS_BACKUP ? config.BACKUP_HEROKU_TOKEN : config.HEROKU_TOKEN,
        otherToken = config.IS_BACKUP ? config.HEROKU_TOKEN : config.BACKUP_HEROKU_TOKEN;

        // Turn on backup then turn off ours
        try {
            await this.scale(
                other,
                1,
                otherToken
            );
            await this.scale(
                current,
                0,
                currentToken
            );
        } catch(e) {}
    },
    init: function() {
        // TODO: Check if the curent server should be up, or if it restarted before switching and came back after the schedule time
        // or something weird like that
    },
}

const cron = Object.assign(
    // Has such a shitty footprint that I have to comment what each numbered param means
    new CronJob(
        // Cronjob syntax for scheduler
        alwaysonline.cron || '0 0 0 0 0 0',
        // Function to call
        alwaysonline.task,
        // On complete, we don't need it
        null,
        // Start scheduler immediately, we do need it, used for disables
        true,
        // Timezone, we use UTC
        null,
        // Context for function call, we want module.exports as the this value
        alwaysonline,
        // Run task immediately, we don't need it
        null,
        // UTC offset, I don't know why this separate from the timezone one
        0
    ),
    alwaysonline
);

module.exports = cron;