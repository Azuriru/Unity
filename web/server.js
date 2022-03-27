const path = require('path');
const express = require('express');
const app = express();

const STATIC_PATH = path.join('output');
const ASSET_PATH = path.resolve(__dirname, '../assets');

console.log(ASSET_PATH);
console.log(STATIC_PATH);
app.use(express.static(STATIC_PATH));
app.use('/', express.static(ASSET_PATH));

app.get('/', (_, res) => {
    res.sendFile(path.join(STATIC_PATH, 'index.html'));
});

const server = app.listen(process.env.PORT || 3000, () => console.log(`Listening on port ${process.env.PORT || 3000}`));
