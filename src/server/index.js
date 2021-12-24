const path = require('path');
const express = require('express');
const alwaysonline = require('./alwaysonline');
const app = express();
const ASSET_PATH = path.resolve(__dirname, '../../assets');

app.use('/', express.static(ASSET_PATH));

app.get('/run/alwaysonline', (req, res) => {
    alwaysonline.task()
    res.end('Running');
});

app.listen(process.env.PORT || 3000, () => console.log(`Listening on port ${process.env.PORT || 3000}`));