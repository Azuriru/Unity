const { parentPort } = require('worker_threads');
const got = require('got');
const { parse } = require('node-html-parser');
const puppeteer = require('puppeteer');
const browserPromise = puppeteer.launch({
    args: ["--no-sandbox"]
});

browserPromise.catch(() => {});

function fetchData(meta) {
    return new Promise(async resolve => {
        console.log('awaiting browser...');
        let browser;
        try {
            browser = await browserPromise;
        } catch(e) {
            console.info('Browser failed to launch');

            resolve([]);

            return;
        }

        console.log('awaiting page...');
        const page = await browser.newPage();
        await page.setUserAgent(meta.USER_AGENT);

        page.on('response', async (response) => {
            const request = response.request();

            try {
                const buffer = await response.buffer();

                console.log(`Request: ${request.url()}`);
                console.log(`Response: ${buffer.byteLength}`);

                if (request.url().includes('/ajax/')) {
                    // require('fs').writeFileSync(`./response ${Date.now()}.txt`, `${request.url()}\n${buffer}`);
                }

                if (request.url().includes('/ajax/list/')) {
                    const object = JSON.parse(buffer.toString());
                    if (object.ok === false) {
                        reject(object);
                    } else {
                        resolve(object);
                    }

                    // await page.close();
                }
            } catch(e) {
                console.log(`Request failed to get response: ${request.url()}`);
            }
        });

        await page.goto('https://dstserverlist.appspot.com/');
    });
}

async function doFetch(meta) {
    console.log('fetch start', meta);
    console.time('fetching');
    const res = await fetchData(meta);
    console.timeEnd('fetching');

    console.time('parsing');
    const document = parse(res.result);
    console.timeEnd('parsing');

    console.time('deserializing');
    const servers = document.querySelectorAll('.list > tr').map(row => {
        // Highly optimized implementation to avoid querySelectors
        // View older commits to find a more understandable version

        // Id is used to fetch more data about the server if the name matches
        const id = row.getAttribute('id');

        // firstData contains server type, flag, country, name, and icons
        const firstData = row.childNodes[0];

        // platformData contains the platform the server hosts for
        const platformData = row.childNodes[1];

        // playerData contains player info and a lock if it's passworded
        const playerData = row.childNodes[2];

        // modeData contains just a single text node with endless/survival
        const modeData = row.childNodes[3];

        // seasonData contains the current season
        const seasonData = row.childNodes[4];

        // Get name
        const name = firstData.childNodes[2].text;

        // Get country name and code
        const flag = firstData.childNodes[1];
        const country = flag.getAttribute('data-tooltip');
        const countryClass = flag.getAttribute('class');
        const countryCodeDashIndex = countryClass.lastIndexOf('-');
        const countryCode = countryClass.slice(countryCodeDashIndex + 1);

        // Get platform: Steam, WeGame, PS4, more?
        const platform = platformData.text;

        // Get player count, fpy is also used to check for password
        const playersText = playerData.text;
        const index = playersText.indexOf('/');
        const playerCount = Number(playersText.slice(0, index));
        const maxPlayers = Number(playersText.slice(index + 1));

        // Get gamemode (normal/endless) and current season
        const mode = modeData.text;
        const season = seasonData.text;

        // Get some flags: modded, outdated, pvp, official, passworded
        const icons = firstData.childNodes.slice(4);
        const modded = icons.some(icon => icon.text === 'settings');
        const outdated = icons.some(icon => icon.text === 'warning');
        const pvp = icons.some(icon => icon.text === 'restaurant_menu');
        const official = icons.some(icon => icon.text === 'check_circle');

        // Player count can have a lock icon if it's passworded
        const passworded = playerData.childNodes.length === 2;

        return {
            id,
            country,
            countryCode,
            platform,
            playerCount,
            maxPlayers,
            name,
            lc: name.toLowerCase(),
            mode,
            season,
            modded,
            outdated,
            pvp,
            official,
            passworded
        };
    });
    console.timeEnd('deserializing');

    return servers;
}

parentPort.on('message', async data => {
    switch (data.type) {
        case 'fetch':
            try {
                const servers = await doFetch(data.payload.meta);

                parentPort.postMessage({
                    kind: 'success',
                    payload: servers
                });
            } catch(e) {
                parentPort.postMessage({
                    kind: 'error',
                    error: e
                });
            }
            break;
    }
});
