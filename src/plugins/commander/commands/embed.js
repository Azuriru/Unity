const { SlashCommandBuilder } = require('@discordjs/builders');
const Command = require('../structs/Command.js');
const FormatterPlugin = require('../../fmt');
const { promisify } = require('util');
const wait = promisify(setTimeout);

class EmbedCommand extends Command {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

    constructor(bot) {
        super(bot);
        this.aliases = ['embed'];
        this.schema = new SlashCommandBuilder()
            .addSubcommand(subcommand =>
                subcommand
                    .setName('new')
                    .setDescription('Info about a user')
                    .addStringOption(option =>
                        option.setName('args')
                            .setDescription('The embed arguments')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('update')
                    .setDescription('Updates an existing embed message')
                    .addStringOption(option =>
                        option.setName('url')
                            .setDescription('The message link')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('args')
                            .setDescription('The embed arguments')
                            .setRequired(true)
                    )
            );

        this.QUOTE_PATTERN = /<?https?:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/channels\/(@me|\d+)\/(\d+)\/(\d+)>?/;

        const fmt = this.bot.fmt;
        this.shortdesc = `Creates or updates rich embeds.`
        this.desc = `
                    Creates or updates rich embeds.
                    ${fmt.code('args')} needs to be a semicolon-separated list of arguments to the embed.
                    To use a semicolon inside an argument value, just add a backslash \\ before it.
                    If you use a code block, separate arguments with newlines. Semicolons are unnecessary, and ignored, no need to backslash.
                    Leave a value blank to delete it. Missing parameters in an ${fmt.code('update')} will remain the same.
                    If the mode is ${fmt.code('new')}, this command will delete its invocation.
                    You need to have the MANAGE_MESSAGES permission to use this command.`;
        this.usages = [
            '!embed new [args]',
            // '!embed update <message id> #channel [args]', TODO: Officially unsupport
            '!embed update <message link> [args]'
        ];
        this.examples = [
            '!embed new title=New update!; description = Rich embed management is now available!',
            `!embed new ${fmt.codeBlock('ini', `
author =
  name: Author name
  url: https://github.com/Dorumin?tab=followers
  icon: https://i.vgy.me/1MjOsN.png
color = #00FFFF
title = Exhaustive
url = https://youtu.be/SN9IZ86evb4
thumbnail = https://i.vgy.me/HkNnkH.png
description = Example
fields[0] = Field title:
You can add newlines between fields
fields[1] = ~Inline field
Mixing inline and block fields is usually a bad idea
fields[2] = ~Second inline field:
But you can do it, if you so desire
image = https://i.ytimg.com/vi/SN9IZ86evb4/maxresdefault.jpg
footer =
  text: Wait what
timestamp = 2019-10-30T11:00:00.000Z
                `
            )}`,
            `!embed update https://discord.com/channels/246075715714416641/246663167537709058/269876798953750528 ${fmt.codeBlock('ini', `
title =
url =
description = Ignore this update! Changes were rollbacked, wait for further news...
                `
            )}`
        ];
    }

    async call(message, content, { interaction }) {
        const [ mode ] = content.split(/\s/, 1);

        switch (mode) {
            case 'new':
                await this.handleNewEmbed(message, content.slice(mode.length).trim());
                break;
            case 'update':
                await this.handleUpdateEmbed(message, content.slice(mode.length).trim());

                if (interaction && !message._replied) {
                    await interaction.reply({
                        content: 'Embed updated',
                        ephemeral: true
                    });
                }
                break;
            default:
                await message.channel.send('No mode detected! Make sure to prefix your message with `new` or `update`. Use >help embed for more info.');
        }
    }

    async handleNewEmbed(message, content) {
        const args = this.parseArgs(content),
        errors = args.filter(arg => arg instanceof Error);

        if (errors.length) {
            return message.channel.send(errors);
        }

        if (!args.length) {
            const lol = await message.channel.send('No arguments detected! Do you... want an empty embed? ok den, sure');
            await message.channel.send({ embeds: [{}] });
            await wait(2000);
            return lol.delete();
        }

        const embed = this.buildEmbed(args);

        await message.channel.send({ embeds: [embed] });
        try {
            await message.delete();
        } catch (error) {
            // We probably can't delete messages.
        }
    }

    async handleUpdateEmbed(invoker, content) {
        const quoteMatch = String(content).match(this.QUOTE_PATTERN);
        let channel;
        let message;

        if (quoteMatch) {
            channel = await this.bot.client.channels.fetch(quoteMatch[2]);

            if (!channel) {
                return invoker.channel.send(`Could not find channel with id: ${quoteMatch[2]}`);
            }

            try {
                message = await channel.messages.fetch(quoteMatch[3]);
            } catch(e) {}

            if (!message) {
                return invoker.channel.send(`Could not find message with id: ${quoteMatch[3]}`);
            }

            if (message.author.id != this.bot.client.user.id) {
                return invoker.channel.send(`Sorry, but I can't update others' messages.`);
            }

            content = content.slice(0, quoteMatch.index) + content.slice(quoteMatch.index + quoteMatch[0].length);
        } else {
            // TODO: Officially unsupport message ID and #chan?
            return invoker.channel.send(`Did not find a message quote in your message! Note that ID + channel is currently unsupported`);
        }

        const args = this.parseArgs(content.trim()),
        errors = args.filter(arg => arg instanceof Error);

        if (errors.length) {
            return invoker.channel.send(errors);
        }

        if (!args.length) {
            return await invoker.channel.send('No arguments detected!');
        }

        const embed = this.buildEmbed(args, this.getDefaults(message));

        await message.edit({ embeds: [embed] });
    }

    parseArgs(string) {
        let codeBlock = false;

        if (string.startsWith('```') && string.endsWith('```')) {
            codeBlock = true;

            string = string.slice(3, -3);

            if (/^\w+\n/.test(string)) {
                string = string.replace(/^.+\n/, '');
            }
        }

        let entries = [];

        if (codeBlock) {
            entries = this.groupLines(string, line => /^\s*[\w\[\]]+\s*=/.test(line));
        } else {
            entries = string.split(/(?<!(?<!\\)\\);/g);
        }

        const keyValuePairs = entries.map(entry => {
            const standardized = entry.trim().replace(/;$/, '');
            const match = standardized.match(/([\w\[\]]+)\s*=\s*([\s\S]*)/);
            if (!match) return null;

            const [ _, key, value ] = standardized.match(/([\w\[\]]+)\s*=\s*([\s\S]*)/);

            return [key.toLowerCase(), value];
        });

        const properties = keyValuePairs.filter(Boolean).map(([key, value]) => {
            switch (key) {
                case 'title':
                    if (value.split('\n').length > 1) {
                        return new Error(`title can't be multiline.`);
                    }

                    return [key, value];
                case 'url':
                    if (value.split('\n').length > 1) {
                        return new Error(`url can't be multiline.`);
                    }

                    // TODO: Validate url
                    return [key, value];
                case 'color':
                    const color = parseInt(value.replace('#', ''), 16);

                    if (isNaN(color)) {
                        return new Error('Invalid color');
                    }

                    return [key, color];
                case 'image':
                    if (value.split('\n').length > 1) {
                        return new Error(`image url can't be multiline.`);
                    }

                    // TODO: Validate url
                    return [key, { url: value }];
                case 'thumbnail':
                    if (value.split('\n').length > 1) {
                        return new Error(`thumbnail url can't be multiline.`);
                    }

                    // TODO: Validate url
                    return [key, { url: value }];
                case 'timestamp':
                    const date = new Date(value.trim());
                    if (isNaN(date)) {
                        return new Error(`Invalid timestamp.`);
                    }

                    // TODO: Validate url
                    return [key, value];
                case 'description':
                    // No need to check for length, I guess; messages can't be longer than 2000
                    return [key, value];
                case 'author':
                    const authorResult = this.parseSubArgs(key, value);

                    if (!authorResult[1].name) {
                        return new Error('Missing required arg in author: name');
                    }

                    return authorResult;
                case 'footer':
                    const footerResult = this.parseSubArgs(key, value);

                    if (!footerResult[1].text) {
                        return new Error('Missing required arg in footer: text');
                    }

                    return footerResult;
                case 'fields':
                    return new Error(`You can't set fields directly! Try setting your first field as fields[0]`);

                    // const fieldsResult = this.parseSubArgs(key, value, false);

                    // if (Object.keys(fieldsResult[1]).length === 0) {
                    //     return new Error('Detected no fields! Please ensure you formatted it correctly.');
                    // }

                    // return fieldsResult;
                default:
                    const fieldMatch = key.match(/^fields\[(\d+)\]$/i);
                    if (fieldMatch) {
                        const index = fieldMatch[1];
                        const lines = value.trim().split('\n');

                        if (lines.length === 1) {
                            return new Error(`${key}: Missing field content, make sure the first line is the field title and the rest is the field content`);
                        }


                        return [`field`, `${index}\n${value.trim()}`];
                    }

                    return new Error(`Unknown property: ${key}`);
            }
        });

        return properties;
    }

    parseSubArgs(key, value, lc = true) {
        const args = {};
        const grouped = this.groupLines(value, line => /\s*.+?\s*:/.test(line));

        grouped.forEach(entry => {
            const standardized = entry.trim();
            const [ _, key, value ] = standardized.match(/(.+?)\s*:\s*([\s\S]*)/);

            args[lc ? key.toLowerCase() : key] = value;
        });

        return [key, args];
    }

    groupLines(string, fn) {
        const lines = string.split('\n'),
        grouped = [],
        indices = [];

        lines.forEach((line, index) => {
            if (fn(line, index)) {
                indices.push(index);
            }
        });

        indices.forEach((index, i) => {
            grouped.push(lines.slice(index, indices[i + 1] || lines.length).join('\n'));
        });

        return grouped;
    }

    getDefaults(message) {
        // Note: Array, not Collection
        const embed = message.embeds[0],
        defaults = {};

        if (!embed) return defaults;

        if (embed.author) {
            defaults.author = {};
            defaults.author.name = embed.author.name;

            if (embed.author.url) {
                defaults.author.url = embed.author.url;
            }

            if (embed.author.iconURL) {
                defaults.author.icon_url = embed.author.iconURL;
            }
        }

        if (embed.thumbnail) {
            defaults.thumbnail = {};

            defaults.thumbnail.url = embed.thumbnail.url;
        }

        if (embed.color) {
            defaults.color = embed.color;
        }

        if (embed.title) {
            defaults.title = embed.title;
        }

        if (embed.url) {
            defaults.url = embed.url;
        }

        if (embed.description) {
            defaults.description = embed.description;
        }

        if (embed.fields.length) {
            defaults.fields = embed.fields.map(field => {
                return {
                    name: field.name,
                    value: field.value,
                    inline: field.inline
                };
            });
        }

        if (embed.image) {
            defaults.image = {};

            defaults.image.url = embed.image.url;
        }

        if (embed.footer) {
            defaults.footer = {};

            defaults.footer.text = embed.footer.text;

            if (embed.footer.iconURL) {
                defaults.footer.icon_url = embed.footer.icon_url;
            }
        }

        if (embed.timestamp) {
            defaults.timestamp = new Date(embed.timestamp).toISOString();
        }

        return defaults;
    }

    buildEmbed(props, defaults = {}) {
        defaults.fields = defaults.fields || [];

        props.forEach(([key, val]) => {
            switch (key) {
                // case 'fields':
                //     const fields = [];

                //     for (const key in val) {
                //         const value = val[key];
                //         const inline = key.startsWith('~');
                //         const name = inline ? key.slice(1) : key;

                //         fields.push({
                //             name,
                //             value,
                //             inline
                //         });
                //     }

                //     defaults.fields = fields;
                //     break;
                case 'field':
                    let [index, title, ...rest] = val.split('\n');
                    const content = rest.join('\n');
                    let inline = false;

                    index = Number(index);

                    // No content was provided, so we remove the field
                    // index is there no matter what
                    if (!title) {
                        defaults.fields[index] = null;
                        return;
                    }

                    if (title.charAt(0) === '~') {
                        title = title.slice(1);
                        inline = true;
                    }

                    defaults.fields[index] = {
                        name: title,
                        value: content,
                        inline
                    };
                    break;
                case 'author':
                case 'footer':
                    if (val.icon) {
                        val.icon_url = val.icon;
                        delete val.icon;
                    }

                    defaults[key] = val;
                    break;
                default:
                    defaults[key] = val;
                    break;
            }
        });

        defaults.fields = defaults.fields.filter(Boolean);

        return defaults;
    }
}

module.exports = EmbedCommand;
