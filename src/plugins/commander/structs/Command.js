class Command {
    constructor(bot) {
        this.bot = bot;
        this.priority = 0;
        this.aliases = [];
    }

    static get deps() {
        return [];
    }

    isOperator(message) {
        return this.bot.config.OPERATORS.includes(message.author.id);
    }

    isModerator(message) {
        return message.guild && message.channel.permissionsFor(message.member.user).any('MANAGE_MESSAGES');
    }

    isAdmin(message) {
        return message.guild && message.member.permissions.has('ADMINISTRATOR');
    }

    filter() {
        return true;
    }

    call() {
        throw new Error('call() not implemented');
    }

    cleanup() {}
}

module.exports = Command;
