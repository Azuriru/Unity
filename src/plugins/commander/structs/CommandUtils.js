class CommandUtils {
    static async react(message, ...emojis) {
        for (let i = 0; i < emojis.length; i++) {
            await message.react(emojis[i]);
        }
    }

    static async clearReactions(message) {
        try {
            await message.reactions.removeAll();
        } catch(e) {
            await this.removeOwnReactions(message);
        }
    }

    static async removeOwnReactions(message) {
        return Promise.all(
            message.reactions.cache
                .filter(reaction => reaction.me)
                .map(reaction => reaction.remove())
        );
    }
}

module.exports = CommandUtils;
