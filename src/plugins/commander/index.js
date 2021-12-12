const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const Plugin = require('../../structs/Plugin.js');
const Collection = require('../../structs/Collection.js');
const Cache = require('../../structs/Cache.js');
const LoggerPlugin = require('../logger');
const FormatterPlugin = require('../fmt');
const InteractionCompatibilityLayer = require('./structs/InteractionCompatibilityLayer.js');

class CommanderPlugin extends Plugin {
    static get deps() {
        return [
            LoggerPlugin,
            FormatterPlugin,
        ];
    }

    load() {
        this.bot.commander = new Commander(this.bot);
    }

    cleanup() {
        return this.bot.commander.cleanup();
    }
}

class Commander {
    constructor(bot) {
        this.commands = new Collection();
        this.messageMatchers = new Cache();
        this.bot = bot;
        this.dev = bot.config.ENV === 'development';
        this.config = bot.config.COMMANDER;
        this.prefixes = this.config.PREFIXES;
        this.whitespace = [9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279];

        this.log = this.bot.logger.log.bind(this.bot.logger, 'commander');

        bot.client.on('ready', bot.wrapListener(this.registerSlashCommands, this));
        bot.client.on('messageCreate', bot.wrapListener(this.onMessage, this));
        bot.client.on('interactionCreate', bot.wrapListener(this.onInteraction, this));
    }

    async onInteraction(interaction) {
        if (!interaction.isCommand()) return;

        const command = this.getAlias(interaction.commandName);
        const compat = new InteractionCompatibilityLayer(interaction);

        // Rights check or whatever for commands
        if (!command.filter(compat)) return;

        this.callCommand(command, compat, compat._unprefixedContent, {
            alias: interaction.commandName,
            interaction: interaction
        });
    }

    async registerSlashCommands() {
        var commands = this.commands.array().filter(command => command.schema);
        if (commands.length === 0) return;

        commands.forEach(command => {
            if (command.schema.name === undefined) {
                command.schema.setName(command.aliases[0]);
            }

            if (command.schema.description === undefined) {
                command.schema.setDescription(command.shortdesc);
            }
        });

        const rest = new REST({ version: '9' }).setToken(this.bot.client.token);

        try {
            await rest.put(
                Routes.applicationCommands(this.bot.client.application.id),
                {
                    body: commands.map(c => c.schema.toJSON())
                }
            );
        } catch(e) {
            console.error('Failed while registering slash commands');
            console.error(e);
        }
    }

    loadCommand(Command, name) {
        let log = `Loading command ${Command.name} ${name}.js`;
        const deps = Command.deps;

        if (deps.length) {
            log += `\nDependencies:\n${deps.map(plugin => `  - ${plugin.name}`).join('\n')}`;
        }

        this.log(log);

        deps.forEach(this.bot.loadPlugin.bind(this.bot));

        const command = new Command(this.bot);
        command.aliases = command.aliases.map(alias => alias.toLowerCase());

        this.commands.set(name, command);
    }

    loadCommandDir(dir) {
        const wl = this.config.WHITELIST;
        const bl = this.config.BLACKLIST;
        fs.readdirSync(dir).forEach(file => {
            const p = path.join(dir, file);
            const name = file.replace(/\.js$/, '');
            if (wl instanceof Array && !wl.includes(name)) {
                return;
            }
            if (bl instanceof Array && bl.includes(name)) {
                return;
            }
            try {
                const Command = require(p);
                this.loadCommand(Command, file.slice(0, -3));
            } catch(e) {
                this.log(`Failure while parsing command: ${file}`);
                this.log(e.stack);
            }
        });

        this.sortCommandsByPriority();
    }

    sortCommandsByPriority() {
        this.commands = this.commands.sort((a, b) => b.priority - a.priority);
        this.validateCommandAliases();
    }

    validateCommandAliases() {
        const priorityAliases = {
            0: [],
            1: [],
            2: [],
            3: [],
            4: []
        },
        aliasMap = {
            0: {},
            1: {},
            2: {},
            3: {},
            4: {}
        };
        this.commands.each(command => {
            if (!command.aliases.length) {
                this.log(`Command has no defined aliases: ${command}`);
                return;
            }

            command.aliases = command.aliases.filter(alias => {
                const conflicting = priorityAliases[command.priority].includes(alias);
                if (conflicting) {
                    this.log(`Duplicate alias: ${alias}`);
                    this.log(`Conflicting commands: ${aliasMap[command.priority][alias].constructor.name} & ${command.constructor.name}`);
                    return false;
                }

                priorityAliases[command.priority].push(alias);
                aliasMap[command.priority][alias] = command;

                return true;
            });
        });
    }

    onMessage(message) {
        // Ignore bots and self
        if (
            message.author.bot ||
            message.author.id === this.bot.client.user.id
        ) return;

        if (this.dev && message.guild && this.bot.config.DEV.GUILD !== message.guild.id) return;

        return this.messageMatchers.get(message.id, () => this.tryMatchCommands(message));
    }

    async tryMatchCommands(message) {
        const text = message.content.trim();
        const prefixes = await this.getPrefixes(message.guild);
        let i = prefixes.length;
        let matched = false;

        while (i--) {
            const prefix = prefixes[i];
            if (text.slice(0, prefix.length) != prefix) continue;

            const trimmed = text.slice(prefix.length).trimLeft();
            for (const command of this.commands.values()) {
                const aliases = command.aliases;
                let i = aliases.length;

                while (i--) {
                    const alias = aliases[i];
                    // Ensure str[prefix..prefix+alias] == alias
                    if (trimmed.slice(0, alias.length).toLowerCase() != alias) continue;

                    const code = trimmed.charCodeAt(alias.length);
                    // Return if the character after the command isn't NaN (EOF) and isn't whitespace
                    if (code === code && !this.whitespace.includes(code)) continue;
                    // Filter function implemented by commands
                    if (!command.filter(message)) continue;
                    // Don't run commands for bots
                    if (!command.bot && message.author.bot) continue;

                    matched = true;

                    const content = trimmed.slice(alias.length + 1).trimLeft();

                    this.callCommand(command, message, content, {
                        alias
                    });
                }

                if (matched) break;
            }

            if (matched) break;
        }

        return matched;
    }

    async getPrefixes(guild) {
        const prefixes = guild && this.prefixes.hasOwnProperty(guild.id)
            ? this.prefixes[guild.id]
            : this.prefixes.DEFAULT;

        if (this.config.MENTION) {
            const id = this.bot.client.user.id;
            return prefixes.concat([`<@${id}>`, `<@!${id}>`]);
        }

        return prefixes;
    }

    getAlias(alias) {
        for (const command of this.commands.values()) {
            const aliases = command.aliases;
            let i = aliases.length;

            while (i--) {
                if (aliases[i] == alias) {
                    return command;
                }
            }
        }

        return null;
    }

    run(alias, message, content) {
        const command = this.getAlias(alias);
        if (!command) return;

        return this.callCommand(command, message, content);
    }

    async callCommand(command, message, content, extra) {
        try {
            await command.call(message, content.trim(), extra);
        } catch(e) {
            const lines = e.stack.split('\n');
            const firstRelevant = lines.findIndex(line => line.includes('Commander.callCommand'));
            const relevantLines = lines.slice(0, firstRelevant);
            this.cleanStack = this.cleanStack || (await import('clean-stack')).default;
            const errorMessage = `${command.constructor.name}CallError: ${this.cleanStack(relevantLines.join('\n'))}`;

            this.log(errorMessage);

            if (this.config.INLINE_ERRORS) {
                await message.channel.send(this.bot.fmt.codeBlock('apache', errorMessage));
            } else {
                await this.bot.reportError(`Error while executing ${command.constructor.name}:`, e);
            }
        }
    }

    async cleanup() {
        for (const command of this.commands.values()) {
            await command.cleanup();
        }
    }
}

module.exports = CommanderPlugin;
