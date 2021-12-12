const { SlashCommandBuilder } = require('@discordjs/builders');
const Command = require('../structs/Command.js');
const YouTubePlugin = require('../../youtube');
const CommandUtilsPlugin = require('../../command-utils/index.js');
const FormatterPlugin = require('../../fmt/index.js');

class YouTubeCommand extends Command {
    static get deps() {
        return [
            YouTubePlugin,
            CommandUtilsPlugin,
            FormatterPlugin
        ];
    }

    constructor(bot) {
        super(bot);
        this.aliases = ['youtube', 'yt', 'yts'];
        this.schema = new SlashCommandBuilder()
            .addStringOption(option =>
                option.setName('query')
                    .setDescription('The search query')
                    .setRequired(true)
            );

        this.shortdesc = `Searches youtube`;
        this.desc = `
            Searches YouTube for a given search query
            The prefix "yts" provides a set of results
            `;
        this.usages = [
            '!yt Ken Ashcorp',
            '!yts Tom Scott'
        ];
    }

    async call(message, content, { alias }) {
        if (!content) {
            await message.channel.send('Please provide a search query.');
            return;
        }

        const results = await this.bot.youtube.search(content);

        if (results.length === 0) {
            await message.channel.send('Sorry, no results!');
            return;
        }

        if (alias === 'yts') {
            await this.postResults(message, results);
        } else {
            await message.channel.send(`https://youtu.be/${results[0].id.videoId}`);
        }
    }

    async postResults(originalMessage, results) {
        if (results.length > 5) {
            results = results.slice(0, 5);
        }

        const content = this.bot.fmt.codeBlock('asc',
            results.map((result, i) => `[${i + 1}] ${result.snippet.title}`)
                .join('\n')
        );
        const message = await originalMessage.channel.send(content);

        const manager = this.bot.commandUtils.reactionManager(message)
            .timeout(30000)
            .onTimedOut(() => {
                message.edit('Sorry, you took too long!');
            })
            .addUserId(originalMessage.author.id);

        for (let index = 0; index < results.length; index++) {
            manager.addReaction(
                this.getEmoji(index + 1),
                this.onResultChoose.bind(this, {
                    message,
                    results,
                    index,
                    manager
                })
            );
        }

        await manager.listen();
    }

    getEmoji(index) {
        switch (index) {
            case 1: return '1️⃣';
            case 2: return '2️⃣';
            case 3: return '3️⃣';
            case 4: return '4️⃣';
            case 5: return '5️⃣';
            default: return '🤷‍♀️';
        }
    }

    async onResultChoose({ message, results, index, manager }) {
        // Discard all reactions, likely to fail because message is attempted
        // to be deleted next
        manager.clear().catch(() => {});

        const result = results[index];

        try {
            await Promise.all([
                message.delete(),
                message.channel.send(`https://youtu.be/${result.id.videoId}`)
            ]);
        } catch(e) {}
    }
}

module.exports = YouTubeCommand;
