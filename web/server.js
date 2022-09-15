const path = require('path');
const express = require('express');
const app = express();

const STATIC_PATH = path.join('output');
const ASSET_PATH = path.resolve(__dirname, '../assets');

app.use(express.static(STATIC_PATH));

app.use('/assets', express.static(ASSET_PATH));

app.get('/', (_, res) => {
    res.sendFile(path.resolve(__dirname, STATIC_PATH, 'index.html'));
});

app.listen(process.env.PORT || 3000, () => console.log(`Listening on port ${process.env.PORT || 3000}`));
