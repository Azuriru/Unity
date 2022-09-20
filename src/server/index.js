const path = require('path');
const express = require('express');
const app = express();
const ASSET_PATH = path.resolve(__dirname, '../../assets');

app.use('/', express.static(ASSET_PATH));

app.get('/', (_, res) => {
    res.end('Deez Nuts.');
});

app.listen(process.env.PORT || 3000, () => console.log(`Listening on port ${process.env.PORT || 3000}`));