const { Message, Channel, Guild, MessageReaction } = require("discord.js");

function isMessagePartial(message) {
    return message?.partial
        || isChannelPartial(message?.channel)
        || isGuildPartial(message?.guild);
}

function isChannelPartial(channel) {
    return channel?.partial
        || isGuildPartial(channel?.guild);
}

function isGuildPartial(guild) {
    return guild?.partial;
}

function isMessageReactionPartial(reaction) {
    return reaction?.partial
        || isMessagePartial(reaction?.message);
}

function isPartial(struct) {
    if (struct?.partial) {
        return true;
    }

    if (struct instanceof Message) {
        return isMessagePartial(struct);
    }

    if (struct instanceof Channel) {
        return isChannelPartial(struct);
    }

    if (struct instanceof Guild) {
        return isGuildPartial(struct);
    }

    if (struct instanceof MessageReaction) {
        return isMessageReactionPartial(struct);
    }

    return false;
}

module.exports.isPartial = isPartial;