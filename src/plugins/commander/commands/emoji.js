const { MessageEmbed } = require('discord.js');
const Command = require('../structs/Command.js');
const FormatterPlugin = require('../../fmt');

const EMOJI_REGEX = /<(a?):(\w+):(\d+)>/;

class EmojiCommand extends Command {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

    constructor(bot) {
        super(bot);
        this.aliases = ['emoji', 'emote', 'jumbo'];

        this.shortdesc = 'Enlarges an emoji';
        this.desc = `
            Posts an embed that enlarges an emote in the message or reference.`;
        this.usages = [
            '!emoji :custom_emote:',
            '!emote <reply to a message with an emote>'
        ];
    }

    async call(message, content) {
        let match = content.match(EMOJI_REGEX);

        if (match === null && message.reference) {
            const referenced = await message.channel.messages.fetch(message.reference.messageId);

            if (referenced && referenced.content) {
                match = referenced.content.match(EMOJI_REGEX);
            }
        }

        if (match === null) {
            await message.channel.send('No emoji found in your message');
            return;
        }

        const animated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        const ext = animated ? 'gif' : 'png';

        await message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setTitle(`Emoji link: ${name}`)
                    .setURL(`https://cdn.discordapp.com/emojis/${id}.${ext}`)
                    .setImage(`https://cdn.discordapp.com/emojis/${id}.${ext}`)
            ]
        });
    }
}

module.exports = EmojiCommand;
