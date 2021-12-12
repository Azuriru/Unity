class Plugin {
    constructor(bot) {
        this.bot = bot;
        this.client = bot.client;
        this.config = bot.config;
    }

    static get deps() {
        return [];
    }

    load() {
        throw new Error('load() not implemented');
    }

    cleanup() {}
}

module.exports = Plugin;
