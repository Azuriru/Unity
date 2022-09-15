const fs = require('fs');
const path = require('path');
const Plugin = require('../../structs/Plugin.js');

class WebPlugin extends Plugin {
    load() {
        this.bot.web = new Web(this.bot);
    }
}

class Web {
    constructor(bot) {
        this.bot = bot;
    }
}

module.exports = WebPlugin;
