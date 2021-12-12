const AdminCommand = require('../structs/AdminCommand.js');
const FormatterPlugin = require('../../fmt');

class EmojisCommand extends AdminCommand {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

    constructor(bot) {
        super(bot);
        this.aliases = ['emojis', 'emotes'];

        this.shortdesc = 'Posts a list of the server emotes';
        this.desc = `
            Posts one or more embeds listing all the server emoticons.`;
        this.usages = [
            '!emojis'
        ];
    }

    async call(message) {
        const emojis = message.guild.emojis.cache.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        const staticEmoji = emojis.filter(emoji => !emoji.animated);
        const animatedEmoji = emojis.filter(emoji => emoji.animated);

        const messages = [];

        let content = '';
        // Jumbo emojis seem to cap at 27 per message;
        // send another message once content exceeds 2k char or 27 emotes
        let emojisSent = 0;

        // embed.setTitle(`${staticEmoji.size} emojis`);

        for (const emoji of staticEmoji.values()) {
            const emojiStr = `${emoji}`;

            if (content.length + emojiStr.length > 2000 || emojisSent >= 27) {
                messages.push(content);
                content = '';
                emojisSent = 0;
            }

            content += emojiStr;
            emojisSent++;
        }

        messages.push(content);
        content = '';
        emojisSent = 0;

        for (const emoji of animatedEmoji.values()) {
            const emojiStr = `${emoji}`;

            if (content.length + emojiStr.length > 2000 || emojisSent >= 27) {
                messages.push(content);
                content = '';
                emojisSent = 0;
            }

            content += emojiStr;
            emojisSent++;
        }

        messages.push(content);

        for (const content of messages) {
            await message.channel.send(content);
        }
    }
}

module.exports = EmojisCommand;
