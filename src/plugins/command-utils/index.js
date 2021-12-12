const Plugin = require('../../structs/Plugin');

class CommandUtilsPlugin extends Plugin {
    load() {
        this.bot.commandUtils = new CommandUtils(this.bot);
    }
}

class CommandUtils {
    constructor(bot) {
        this.bot = bot;
    }

    reactionManager(message) {
        return new ReactionManager({
            bot: this.bot,
            message
        });
    }
}

class ReactionManager {
    constructor({ bot, message }) {
        this.bot = bot;
        this.message = message;

        this.finished = false;
        this.timeoutActivity = undefined;
        this.timeoutId = -1;
        this.globalTimeoutId = -1;

        this.userIds = [];
        this.reactions = {};
    }

    addUserId(userId) {
        this.userIds.push(userId);

        return this;
    }

    addReaction(emoji, handler) {
        this.reactions[emoji] = handler;

        return this;
    }

    timeout(ms) {
        this.timeoutActivity = ms;

        return this;
    }

    globalTimeout(ms) {
        this.globalTimeoutId = setTimeout(this.onTimeout.bind(this), ms);

        return this;
    }

    onTimeout() {
        this.finished = true;
    }

    async listen() {
        let firstEmoji = true;
        for (const emoji in this.reactions) {

            const promise = this.message.react(emoji);

            // if it's the first emoji
            if (firstEmoji) {
                // properly await it to propagate errors
                firstEmoji = false;
                await promise;
            } else {
                // otherwise, dispose errors, and start listening to
                // user reactions immediately
                promise.catch(() => {});
            }
        }

        while (true) {
            if (this.finished) break;

            const reactions = await this.message.awaitReactions(
                (reaction, user) => {
                    if (user.id === this.bot.client.user.id) {
                        return false;
                    }

                    if (this.userIds.length !== 0 && !this.userIds.includes(user.id)) {
                        return false;
                    }

                    if (!Object.keys(this.reactions).includes(reaction.emoji.name)) {
                        return false;
                    }

                    return true;
                },
                {
                    max: 1,
                    time: this.timeoutActivity
                }
            );

            if (this.finished) break;

            if (!reactions.size) {
                if (this._onTimedOut) {
                    this._onTimedOut(this);
                }

                break;
            }

            const reaction = reactions.first();
            const handler = this.reactions[reaction.emoji];

            handler(reaction);
        }

        if (this._onFinish) {
            this._onFinish();
        }
    }

    clear() {
        this.finish();

        const promises = [];

        for (const emoji in this.reactions) {
            const reaction = this.message.reactions.cache.get(emoji);

            if (reaction) {
                promises.push(reaction.remove());
            }
        }

        return Promise.all(promises);
    }

    finish() {
        this.finished = true;

        if (this.globalTimeoutId) {
            clearTimeout(this.globalTimeoutId);
        }

        return this;
    }

    onFinish(handler) {
        this._onFinish = handler;

        return this;
    }

    onTimedOut(handler) {
        this._onTimedOut = handler;

        return this;
    }
}

module.exports = CommandUtilsPlugin;
