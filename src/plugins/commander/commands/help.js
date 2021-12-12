const CommandUtils = require('../structs/CommandUtils.js');
const Command = require('../structs/Command.js');
const Cache = require('../../../structs/Cache.js');
const FormatterPlugin = require('../../fmt');

class HelpCommand extends Command {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

    constructor(bot) {
        super(bot);
        this.aliases = ['help', 'commands', 'halp', 'h'];
        this.cache = new Cache();
        this.pageSize = 8;

        this.shortdesc = `Displays an interactive embed listing all commands and their descriptions.`;
        this.desc = `You already seem to have a pretty good idea for how it works, yeah?`;
        this.usages = [
            '!help [command]'
        ];
        this.examples = [
            '!help',
            '!help help'
        ];
    }

    async call(message, content) {
        const mentionedUsers = message.mentions.users;
        const target = mentionedUsers.size > 0
            ? mentionedUsers.first()
            : message.author;

        const creator = message.author;
        const controllers = [creator];
        if (mentionedUsers.size > 0) {
            const user = mentionedUsers.first();
            controllers.push(user);
            content = content.replace(new RegExp(`<@!?${user.id}>`), '').trim();
        }

        message.delete().catch(this.bot.logger.suppress);

        if (content) {
            const command = this.bot.commander.getAlias(content.toLowerCase());

            if (!command) {
                try {
                    await creator.send(`There is no existing command with the \`${content.toLowerCase()}\` alias!`);
                } catch (error) {
                    // User probably blocked DMs.
                }
                return;
            }

            try {
                await target.send({
                    embeds: [this.buildCommandEmbed(command)]
                });
            } catch (error) {
                // User probably blocked DMs.
            }
            return;
        }

        const listing = await target.send({
            embeds: [this.buildListingEmbed(0)]
        });

        await CommandUtils.react(listing, '⬅', '➡');

        return this.addReactionListeners(listing, controllers);
    }

    getSortedCommands() {
        return this.bot.commander.commands.array()
            .sort((a, b) => a.aliases[0].localeCompare(b.aliases[0]));
    }

    buildListingEmbed(page) {
        const commands = this.cache.get('commands', () => this.getSortedCommands());

        return {
            title: `Command listing [${page + 1}/${Math.ceil(commands.length / this.pageSize)}]`,
            description: 'To get detailed information on a particular command, use `!help <command>`',
            fields: this.getFields(commands, page * this.pageSize)
        };
    }

    getFields(commands, offset) {
        return commands.slice(offset, offset + this.pageSize).map(this.getField.bind(this));
    }

    getField(command) {
        return {
            name: `!${command.aliases[0]}`,
            value: this.bot.fmt.firstLine(command.shortdesc || command.desc || '*No description provided.*')
        };
    }

    buildCommandEmbed(command) {
        const fileName = this.bot.commander.commands.findKey(cmd => cmd == command);
        const fields = [];

        if (command.aliases.length > 1) {
            const field = {
                name: 'Command aliases',
                value: command.aliases.slice(1).join(', ')
            };

            fields.push(field);
        }

        if (command.usages) {
            const field = {
                name: 'Command usage',
                value: ''
            };

            for (const usage of command.usages) {
                field.value += this.formatUsage(usage) + '\n';
            }

            fields.push(field);
        }

        if (command.examples) {
            const field = {
                name: 'Examples',
                value: ''
            };

            for (const example of command.examples) {
                field.value += example + '\n';
            }

            fields.push(field);
        }

        return {
            author: {
                name: 'View command declaration </>',
                url: `${this.bot.config.SOURCE.URL}/tree/master/src/plugins/commander/commands/${fileName}.js`
            },
            title: `Command description: ${command.aliases[0]}`,
            description: this.bot.fmt.trimLines(command.desc || command.shortdesc || '*No description provided.*'),
            fields
        };
    }

    formatUsage(usage) {
        return usage
            .replace(/<[^>]+>/, '**$&**')
            .replace(/\[[^\]]+\]/, '*$&*');
    }

    async addReactionListeners(message, controllers) {
        const commands = this.cache.get('commands', () => this.getSortedCommands());
        const page = this.cache.get(message.id, () => 0);
        const reactions = await message.awaitReactions({
            filter: (reaction, user) => controllers.some(controller => controller.id === user.id) && ['⬅', '➡'].includes(reaction.emoji.name),
            time: 60000,
            max: 1
        });

        if (!reactions.size) {
            try {
                await CommandUtils.clearReactions(message);
            } catch (error) {
                // We are in DM and can't do this.
            }
            return;
        }

        const reaction = reactions.first();

        switch (reaction.emoji.name) {
            case '➡':
                const pageCount = Math.ceil(commands.length / this.pageSize);
                if (page >= pageCount - 1) break;

                // if (page == pageCount - 1) {
                //     const reaction = message.reactions.get('➡');

                //     if (reaction) {
                //         reaction.remove();
                //     }
                // }

                // if (page == 0) {
                //     CommandUtils.clearReactions(message).then(() => {
                //         CommandUtils.react(message, '⬅', '➡');
                //     });
                // }

                this.cache.set(message.id, page + 1);

                await message.edit({
                    embeds: [this.buildListingEmbed(page + 1)]
                });
                break;
            case '⬅':
                if (page <= 0) break;

                // if (page == 1) {
                //     const reaction = message.reactions.get('⬅');

                //     if (reaction) {
                //         reaction.remove();
                //     }
                // }

                this.cache.set(message.id, page - 1);

                await message.edit({
                    embeds: [this.buildListingEmbed(page - 1)]
                });
                break;
        }

        return this.addReactionListeners(message, controllers);
    }
}

module.exports = HelpCommand;
