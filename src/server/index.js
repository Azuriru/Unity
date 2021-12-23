const config = require('../util/config.js');
const path = require('path');
const express = require('express');

const app = express();
const ASSET_PATH = path.resolve(__dirname, '../../assets');

app.use('/', express.static(ASSET_PATH));

app.listen(process.env.PORT || 3000, () => console.log(`Listening on port ${process.env.PORT || 3000}`));

// Set a self ping interval every 5 minutes
if (config.SERVICE_URL) {
    setInterval(() => {
        request(config.SERVICE_URL, () => {});
    }, 1000 * 60 * 5);
}

if (
    config.HEROKU_TOKEN &&
    config.BACKUP_HEROKU_TOKEN &&
    config.APP_NAME &&
    config.BACKUP_APP_NAME
) {
    require('./alwaysonline.js');
}
