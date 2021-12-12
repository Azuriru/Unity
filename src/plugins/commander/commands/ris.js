const { SlashCommandBuilder } = require('@discordjs/builders');
const Command = require('../structs/Command.js');
const FormatterPlugin = require('../../fmt');
const { MessageEmbed } = require('discord.js');

class ReverseImageSearchCommand extends Command {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

    constructor(bot) {
        super(bot);
        this.aliases = ['ris'];
        this.schema = new SlashCommandBuilder()
            .addStringOption(option =>
                option.setName('url')
                    .setDescription('The url of the image you want to reverse search')
                    .setRequired(true)
            );

        this.shortdesc = `Provides reverse image search links`;
        this.desc = `
            Provides a set of reverse image search links for an image.
            The search providers are Yandex, Google Images, TinEye, IQDB, SauceNao, and trace.moe.
            It can take a link to an image or an attachment.
            Alternatively, you can mention a friend and their avatar will be reverse searched.
            If they have one, of course.
            `;
        this.usages = [
            '!ris https://not.lewd/image.jpg',
            '!ris <nothing here but with an image attached>',
            '!ris @Sophie'
        ];
    }

    async call(message, content) {
        const user = message.mentions.users.first();

        let showImage = false;
        let url = '';
        if (message.attachments.size !== 0) {
            url = message.attachments.first().url;
        } else {
            if (user) {
                showImage = true;
                url = user.avatarURL({
                    format: 'png',
                    dynamic: false,
                    size: 2048
                });
            } else {
                let link = content;
                if (
                    content.charAt(0) === '<' &&
                    content.charAt(content.length - 1) === '>'
                ) {
                    link = link.slice(1, -1);
                }

                if (!this.isValidLink(link)) {
                    message.channel.send('I cannot detect a valid image url.');
                    return;
                }

                url = link;
            }
        }

        const encoded = encodeURIComponent(url);
        const yandex = `https://yandex.com/images/search?rpt=imageview&url=${encoded}`;
        const google = `https://www.google.com/searchbyimage?image_url=${encoded}`;
        const tineye = `https://www.tineye.com/search?url=${encoded}`;
        const iqdb = `https://www.iqdb.org/?url=${encoded}`;
        const saucenao = `https://saucenao.com/search.php?sort=size&order=desc&url=${encoded}`;
        const traceMoe = `https://trace.moe/?auto&url=${encoded}`;

        try {
            await message.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle('Yandex')
                        .setURL(yandex)
                        .setImage(showImage ? url : undefined)
                        .setDescription(this.formatLinks({
                            Google: google,
                            TinEye: tineye,
                            IQDB: iqdb,
                            SauceNao: saucenao,
                            TraceMoe: traceMoe
                        }))
                ]
            });
        } catch(e) {
            console.error(e);
            await message.channel.send('Something went wrong generating the embed.');
        }
    }

    isValidLink(link) {
        if (
            !link.startsWith('http://') &&
            !link.startsWith('https://')
        ) {
            return false;
        }

        // fuck it, good enough
        return true;
    }

    formatLinks(links) {
        let string = '';

        let i = 0;
        for (const name in links) {
            const link = links[name];
            const first = i === 0;

            if (!first) {
                string += ' • ';
            }

            string += this.bot.fmt.link(name, link);

            i++;
        }

        return string;
    }
}

module.exports = ReverseImageSearchCommand;
