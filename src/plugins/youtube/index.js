const got = require('got');
const Plugin = require('../../structs/Plugin');

class YouTubePlugin extends Plugin {
    load() {
        this.bot.youtube = new YouTube(this.bot);
    }
}

class YouTube {
    constructor(bot) {
        this.bot = bot;
        this.config = bot.config.YOUTUBE || {};
        this.tokens = this.config.TOKENS || [];

        if (this.tokens.length === 0 && this.config.TOKEN) {
            this.tokens.push(this.config.TOKEN);
        }
    }

    getToken() {
        const index = Math.floor(Math.random() * this.tokens.length);

        return this.tokens[index];
    }

    async search(query) {
        const results = await got('https://www.googleapis.com/youtube/v3/search', {
            searchParams: {
                part: 'snippet',
                q: query,
                key: this.getToken(),
                type: 'video'
            }
        }).json();

        return results.items;
    }
}

module.exports = YouTubePlugin;
