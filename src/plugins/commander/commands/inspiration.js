const got = require('got');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageAttachment } = require('discord.js');
const Command = require('../structs/Command.js');

class InspirationCommand extends Command {
    constructor(bot) {
        super(bot);
        this.aliases = ['inspiration', 'inspire', 'quote', 'q'];
        this.schema = new SlashCommandBuilder();

        this.shortdesc = `Gives you some inspiration`;
        this.desc = `Inspires you by posting an automatically-generated inspirational quote`;
        this.usages = [
            '!inspiration'
        ];
    }

    async call(message) {
        const url = await got(`http://inspirobot.me/api?generate=true`).text();

        await message.channel.send({
            files: [
                new MessageAttachment(url, 'inspiring.jpg')
            ]
        });
    }
}

module.exports = InspirationCommand;
