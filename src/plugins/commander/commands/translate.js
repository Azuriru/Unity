const got = require('got');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Command = require('../structs/Command.js');
const { Util } = require('discord.js');

class TranslateCommand extends Command {
    constructor(bot) {
        super(bot);
        this.aliases = ['translate', 't'];
        this.schema = new SlashCommandBuilder()
            .addStringOption(option =>
                option.setName('text')
                    .setDescription('The text you want to translate')
                    .setRequired(true)
            );

        this.shortdesc = `Translates some text.`;
        this.desc = `
            Gives you the translation of some text you give, and a link to Google Translate
            You can choose what language to translate into by passing its code as a prefix, e.g. \`es\`.
            `;
        this.usages = [
            '!translate hola',
            `!translate es hello`,
            '!translate ro>en doru',
            '!t es i love you'
        ];
        this.languages = [
            'zh', // Chinese
            'en', // English
            'fr', // French
            'de', // German/D
            'el', // Greek
            'ja', // Weeb
            'ko', // Korean
            'ms', // Malaysian
            'pl', // Polish
            'pt', // Portugese
            'ru', // Russki
            'sr', // Serbian
            'es', // Spanish
        ];

        this.languageMap = {
            gr: 'el',
            sp: 'es',
            ch: 'zh'
        };
    }

    removeMentions(text) {
        return text.replace(/<@[!&]?\d+>/, '').trim();
    }

    async call(message, content) {
        let { text, from, to } = this.extractData(content);

        text = this.removeMentions(text);

        let stillNothing = true;
        if (!text && message.reference && message.channel.id === message.reference.channelId) {
            const referenced = await message.channel.messages.fetch(message.reference.messageId);

            if (referenced.content) {
                text = referenced.content;
                stillNothing = false;
            } else if (
                referenced.embeds.length !== 0 &&
                referenced.embeds[0].type === 'rich' &&
                referenced.embeds[0].description
            ) {
                text = referenced.embeds[0].description;
                stillNothing = false;
            }
        } else if (!text && message.mentions.users.size === 1) {
            const status = this.getStatus(message.mentions.users.first());

            if (status) {
                text = status;
                stillNothing = false;
            }
        }

        if (stillNothing) {
            // Replace any possible mentions with their cleaned up @text form
            text = this.extractData(
                Util.cleanContent(content, message)
            ).text;
        }

        const translation = await this.getTranslation({
            from,
            to,
            text
        });

        await message.channel.send({
            embeds: [{
                title: 'Google Translate',
                url: `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(text)}&op=translate`,
                description: translation
            }]
        });
    }

    getStatus(user) {
        const status = user.presence.activities
            .find(activity => activity.type === 'CUSTOM_STATUS');

        if (status) {
            return status.state;
        } else {
            return null;
        }
    }

    supported(lang) {
        return this.languages.includes(lang) || this.languageMap.hasOwnProperty(lang);
    }

    extractData(content) {
        const match = content.match(/^([a-z]{2})(?:>([a-z]{2}))?(\s|$)/);

        let text;
        let from;
        let to;
        if (match && this.supported(match[1])) {
            text = content.slice(match[0].length).trim();

            if (match[2] && this.supported(match[2])) {
                from = match[1];
                to = match[2];
            } else {
                from = 'auto';
                to = match[1];
            }
        } else {
            text = content;
            from = 'auto';
            to = 'en';
        }

        if (this.languageMap[from]) {
            from = this.languageMap[from];
        }

        if (this.languageMap[to]) {
            to = this.languageMap[to];
        }

        return {
            text,
            from,
            to
        };
    }

    async getTranslation({ from, to, text }) {
        const res = await got(`https://translate.googleapis.com/translate_a/single`, {
            searchParams: {
                client: 'gtx',
                dt: 't',
                sl: from,
                tl: to,
                q: text
            }
        }).json();

        const translation = res[0].map(res => res[0]).join('');

        return translation;
    }
}

module.exports = TranslateCommand;
