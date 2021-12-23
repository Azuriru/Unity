// This file isn't supposed to be pretty, or well coded, or maintainable. It's a hack.
// Also stolen from OpalBot lol
const request = require('request');
const config = require('../util/config');

const get_ms_until_next_swap = (d = new Date()) => {
    if (config.HEROKU.IS_BACKUP) {
        return (
            d.getDate() >= 20 ?
            new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() :
            0
        ) - d.getTime()
    } else {
        return (
            d.getDate() < 20 ?
            new Date(d.getFullYear(), d.getMonth(), 20).getTime() :
            0
        ) - d.getTime()
    }
}

const get_ids = (appname, token) => {
    return new Promise((res, rej) => {
        request('https://api.heroku.com/teams/apps/' + appname, {
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.heroku+json; version=3'
            }
        }, (err, r, body) => {
            if (err) {
                rej(err);
                return;
            }

            body = JSON.parse(body);

            request(`https://api.heroku.com/apps/${body.id}/formation`, {
                headers: {
                    Authorization: 'Bearer ' + token,
                    Accept: 'application/vnd.heroku+json; version=3'
                }
            }, (err, r, body) => {
                if (err) {
                    rej(err);
                    return;
                }

                body = JSON.parse(body)[0];

                if (!body) {
                    rej();
                    return;
                }

                res([body.app.id, body.id]);
            });
        });
    });
};

const get_all_ids = (config) => {
    return Promise.all([
        get_ids(config.HEROKU.APP_NAME, config.HEROKU.TOKEN),
        get_ids(config.HEROKU.BACKUP_APP_NAME, config.HEROKU.BACKUP_TOKEN)
    ]);
};

const scale = (ids, num, token) => {
    return new Promise((res, rej) => {
        request.patch(`https://api.heroku.com/apps/${ids[0]}/formation/${ids[1]}`, {
            form: {
                quantity: num,
                size: 'Free',
                type: 'web'
            },
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.heroku+json; version=3'
            }
        }, (err, r, body) => {
            if (err) {
                rej(err);
                return;
            }

            res(body);
        });
    });
};

get_all_ids(config).then(arr => {
    let [
        app,
        backup
    ] = arr,
    d = new Date();

    setTimeout(() => {
        scale( // turn on that other app
            config.HEROKU.IS_BACKUP ? app : backup,
            1,
            config.HEROKU.IS_BACKUP ? config.HEROKU.TOKEN : config.HEROKU.BACKUP_TOKEN
        ).then(() => {
            scale( // turn off our app
                config.HEROKU.IS_BACKUP ? backup : app,
                0,
                config.HEROKU.IS_BACKUP ? config.HEROKU.BACKUP_TOKEN : config.HEROKU.TOKEN
            ).catch(console.log);
        }).catch(console.log);
    }, Math.max(get_ms_until_next_swap(), 0));
}).catch(console.log);