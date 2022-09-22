const fs = require('fs');
const path = require('path');
const { Client, Intents, Guild, Message } = require('discord.js');
const config = require('./util/config.js');
const { isPartial } = require('./util/partials.js');

class Unity {
    constructor()  {
        Object.defineProperty(this, 'config', { value: config.UNITY });
        Object.defineProperty(this, '_globalConfig', { value: config });

        Object.defineProperty(this, 'client', {
            value: new Client({
                allowedMentions: {
                    parse: ['users', 'roles'],
                    repliedUser: false
                },
                intents: [
                    // We might want to listen for new threads
                    Intents.FLAGS.GUILDS,
                    // Join/leave events
                    Intents.FLAGS.GUILD_MEMBERS,
                    // In case we want to assign roles when users join or leave VC
                    Intents.FLAGS.GUILD_VOICE_STATES,
                    // Commands and moderation
                    Intents.FLAGS.GUILD_MESSAGES,
                    // Listening for reactions as commands
                    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
                    // Listening for commands in DM
                    Intents.FLAGS.DIRECT_MESSAGES,
                    // Reactions on commands like !help
                    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
                    Intents.FLAGS.DIRECT_MESSAGE_TYPING,
                    Intents.FLAGS.GUILD_PRESENCES,
                ].concat(config.UNITY.INTENTS || []),
                partials: [
                    'CHANNEL',
                    'REACTION',
                    'MESSAGE'
                ]
            })
        });

        this.dev = this.config.ENV === 'development';
        this.operators = this.config.OPERATORS;
        this._loggedIn = false;
        this._plugins = [];
        this.loadedPlugins = [];

        this.listen('ready', this.onReady, this);
        this.listen('error', this.onError, this);
    }

    listen(event, handler, context) {
        if (!context) throw new Error(`Must pass a context to the ${event} listener`);

        const callback = this.wrapListener(handler, context);

        this.client.on(event, (...args) => {
            const anyPartial = args.some(isPartial);
            if (anyPartial) {
                console.error('Found partials');
                console.error(args);
                return;
            }

            callback(...args);
        });
    }

    listenPartial(event, handler, context) {
        if (!context) throw new Error(`Must pass a context to the ${event} listener`);

        this.client.on(event, this.wrapListener(handler, context));
    }

    onlyDev(instance) {
        if (!this.dev) {
            return false;
        }

        if (instance instanceof Guild) {
            return this.config.DEV?.GUILD !== instance.id;
        }

        if (instance instanceof Message) {
            if (instance.guild) {
                return this.config.DEV?.GUILD !== instance.guild.id;
            } else {
                return !this.operators.includes(instance.author?.id);
            }
        }

        return false;
    }

    loadPlugin(Plugin) {
        if (this._plugins.includes(Plugin)) return;
        if (this._loggedIn) throw new Error('Plugins must be loaded before calling login()');

        this._plugins.push(Plugin);

        if (Plugin.deps) {
            Plugin.deps.forEach(this.loadPlugin.bind(this));
        }

        const plugin = new Plugin(this);
        plugin.load();
        this.loadedPlugins.push(plugin);
    }

    loadPluginDir(dir) {
        const wl = this.config.PLUGINS?.WHITELIST;
        const bl = this.config.PLUGINS?.BLACKLIST;
        fs.readdirSync(dir).forEach(file => {
            const p = path.join(dir, file);
            if (wl instanceof Array && !wl.includes(file)) {
                return;
            }
            if (bl instanceof Array && bl.includes(file)) {
                return;
            }
            const Plugin = require(p);
            this.loadPlugin(Plugin);
        });
    }

    onReady() {
        console.info('ready');
    }

    onError(error) {
        return this.reportError('Unknown error:', error);
    }

    login(token) {
        if (this._loggedIn) throw new Error('Cannot call login() twice');

        this._loggedIn = true;
        this.client.login(token);
    }

    async reportError(message, error) {
        console.error(message, error);

        if (this.config.REPORTING) {
            let newMessage = message;
            if (error) {
                if (typeof error.stack === 'string') {
                    newMessage += `\`\`\`apache\n${error.stack.slice(0, 1000)}\`\`\``;
                } else {
                    newMessage += `\`\`\`json\n${JSON.stringify(error)}\`\`\``
                }
            }

            const channel = this.client.channels.cache.get(this.config.REPORTING.CHANNEL);
            if (channel) {
                try {
                    await channel.send(newMessage);
                } catch(e) {
                    // Discard error, instance might be destroyed
                }
            }
        }
    }

    unhandledRejection(reason) {
        return this.reportError('Unhanded rejection:', reason);
    }

    wrapListener(listener, context) {
        return function() {
            try {
                return listener.apply(context, arguments);
            } catch (error) {
                return this.bot.reportError('Listener error:', error);
            }
        }.bind(this);
    }

    async cleanup() {
        for (const plugin of this.loadedPlugins) {
            await plugin.cleanup();
        }

        this.client.destroy();
    }
}

module.exports = Unity;