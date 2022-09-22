const Plugin = require('../../structs/Plugin.js');

class ReactionRolesPlugin extends Plugin {
    load() {
        this.bot.reactionRoles = new ReactionRoles(this.bot);
    }
}

class ReactionRoles {
    constructor(bot) {
        Object.defineProperty(this, 'bot', { value: bot });

        bot.listenPartial('messageReactionAdd', this.onReactionAdd, this);
        bot.listenPartial('messageReactionRemove', this.onReactionRemove, this);
    }

    async onReactionAdd(reaction, user) {
        if (reaction.partial) {
            await reaction.fetch();
        }

        const message = reaction.message;

        if (message.partial) {
            await message.fetch();
        }

        const reactionId = reaction.emoji.id;
        const reactionName = reaction.emoji.name;
        const roles = this.getMessageRoles(message);

        const match = roles.find(({ emojiId, emojiName }) => emojiId === reactionId || emojiName === reactionName);
        if (!match) return;

        const guild = message.guild;
        if (!guild) return;

        // Ignore in dev mode if outside of dev guild
        if (this.bot.onlyDev(guild)) return;

        const member = await guild.members.fetch(user.id);
        await member.roles.add(match.roleId);
    }

    async onReactionRemove(reaction, user) {
        if (reaction.partial) {
            await reaction.fetch();
        }

        const message = reaction.message;

        if (message.partial) {
            await message.fetch();
        }

        const reactionId = reaction.emoji.id;
        const reactionName = reaction.emoji.name;
        const roles = this.getMessageRoles(message);

        const match = roles.find(({ emojiId, emojiName }) => emojiId === reactionId || emojiName === reactionName);
        if (!match) return;

        const guild = message.guild;
        if (!guild) return;

        // Ignore in dev mode if outside of dev guild
        if (this.bot.onlyDev(guild)) return;

        const member = await guild.members.fetch(user.id);
        await member.roles.remove(match.roleId);
    }

    getMessageRoles(message) {
        const emojis = message.content
            .split('\n')
            .map(line => {
                const data = line.match(/(?:<(?<animated>a)?:(?<name>[^:]+):(?<id>\d+)>|(?<emoji>[^\w\d\s]+)) <@&(?<role>\d+)>/);

                return {
                    emojiId: data?.groups.id,
                    emojiName: data?.groups.emoji ?? data?.groups.name,
                    roleId: data?.groups.role,
                }
            })
            .filter(data => data.roleId && (data.emojiId || data.emojiName));

        return emojis;
    }
}

module.exports = ReactionRolesPlugin;