const { SlashCommandBuilder } = require('@discordjs/builders');
const Command = require('../structs/Command.js');
const FormatterPlugin = require('../../fmt');

class PickCommand extends Command {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

    constructor(bot) {
        super(bot);
        this.aliases = ['pick', 'choose', 'decide'];
        this.schema = new SlashCommandBuilder()
            .addStringOption(option =>
                option.setName('choices')
                    .setDescription('semicolon-separated options')
            );

        this.shortdesc = `Thinks for you.`;
        this.desc = `Decides important life changing decisions.`;
        this.usages = [
            '!pick 1; 2; 3; 4'
        ];
    }

    async call(message, content) {
        const split = content.split(';');
        const chosen =  split[Math.floor(Math.random() * split.length)].trim();

        await message.channel.send(`I pick ${this.bot.fmt.bold(chosen)}!`);
    }
}

module.exports = PickCommand;
