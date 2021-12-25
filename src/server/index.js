const path = require('path');
const express = require('express');
const cronjobs = require('./cronjobs');
const app = express();
const ASSET_PATH = path.resolve(__dirname, '../../assets');

app.use('/', express.static(ASSET_PATH));

app.get('/run/:job', (req, res) => {
    cronjobs.find(cron => cron.type == req.params.job).task();
    res.end('Running');
})

app.listen(process.env.PORT || 3000, () => console.log(`Listening on port ${process.env.PORT || 3000}`));