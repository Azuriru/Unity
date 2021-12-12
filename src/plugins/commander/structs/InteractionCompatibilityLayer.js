const Collection = require('../../../structs/Collection');
const { MessageMentions } = require('discord.js');

// Copy the useful ones from https://discord.js.org/#/docs/main/stable/class/CommandInteraction if you need
const INTERACTION_REFLECT_KEYS = [
    // "applicationId",
    "channelId",
    // replaced with a proxy in the compat layer
    // "channel",
    "client",
    "createdAt",
    "createdTimestamp",
    "guild",
    "guildId",
    "id",
    "member",
    // Not compatible
    // "type"
];

class InteractionCompatibilityLayer {
    static stringifyOption(option) {
        if (option.value == null && !option.options) {
            return '';
        }

        switch (option.type) {
            case 'SUB_COMMAND':
                return option.name + ' ' + InteractionCompatibilityLayer.stringifyOptions(option.options);
            case 'USER':
                return `<@${option.value}>`;
            case 'CHANNEL':
                return `<#${option.value}>`;
            case 'ROLE':
                return `<@&${option.value}>`;
            case 'MENTIONABLE':
                if (option.user || option.member) {
                    return `<@${option.value}>`;
                } else if (option.channel) {
                    return `<#${option.value}>`;
                } else if (option.role) {
                    return `<@&${option.value}>`;
                }
            default:
                return option.value.toString();
        }
    }

    static stringifyOptions(options) {
        let content = '';

        for (const option of options) {
            content += InteractionCompatibilityLayer.stringifyOption(option) + ' ';
        }

        return content;
    }

    constructor(interaction) {
        this.inner = interaction;

        this._replied = false;
        this._succeeded = false;

        const content = InteractionCompatibilityLayer.stringifyOptions(interaction.options.data);

        this._unprefixedContent = content;
        this.content = '/' + this.inner.commandName + ' ' + content;

        for (const key of INTERACTION_REFLECT_KEYS) {
            this[key] = this.inner[key];
        }
    }

    async reply(...args) {
        if (this._replied) {
            return await this.inner.channel.send(...args);
        }

        this._replied = true;

        let returned;
        try {
            returned = await this.inner.reply(...args);
        } catch(e) {
            if (!this._succeeded) {
                this._replied = false;
            }

            throw e;
        }

        this._succeeded = true;

        if (returned === undefined) {
            return await this.inner.fetchReply();
        }

        return returned;
    }

    get channel() {
        return new Proxy(this.inner.channel, {
            get: (target, key) => {
                if (key === 'send') {
                    return (...args) => {
                        return this.reply(...args);
                    };
                }

                return Reflect.get(target, key);
            }
        });
    }

    get author() {
        return this.inner.user;
    }

    get mentions() {
        const users = new Collection();

        for (const match of this._unprefixedContent.matchAll(MessageMentions.USERS_PATTERN)) {
            const id = match[1];
            const user = this.inner.client.users.cache.get(id);

            if (user) {
                users.set(id, user);
            }
        }

        const mentions = new MessageMentions(this, null, null, false, false);

        // Passing `users` to the mentions constructor seems to do weird stuff
        // You end up with invalid structures with all null fields
        mentions.users = users;

        if (!this.guild) {
            mentions._members = new Collection();
        }

        return mentions;
    }

    get attachments() {
        return new Collection();
    }

    get reactions() {
        return new Collection();
    }
}

module.exports = InteractionCompatibilityLayer;
