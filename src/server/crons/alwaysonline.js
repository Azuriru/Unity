const got = require('got');
const config = require('../../util/config');

module.exports = {
    cron: '0 30 0 1,16 * *',
    type: 'alwaysonline',
    getIds: async function(appname, token) {
        const first = await got(`https://api.heroku.com/teams/apps/${appname}`, {
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.heroku+json; version=3'
            }
        }).json();

        const second = await got(`https://api.heroku.com/apps/${first.id}/formation`, {
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.heroku+json; version=3'
            }
        }).json();

        return [second[0].app.id, second[0].id];
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
    }
}