const OPCommand = require('../structs/OPCommand.js');

class QuitCommand extends OPCommand {
    constructor(bot) {
        super(bot);
        this.aliases = ['quit', 'destroy', 'die'];

        this.shortdesc = `Kills the bot.`;
        this.desc = `
            Kills the bot, destroys the client, and stops execution.
            You need to be a bot operator to use this command.`;
        this.usages = [
            '!quit'
        ];
    }

    async call(message) {
        await message.channel.send('Alright then');

        this.bot.cleanup();
    }
}

module.exports = QuitCommand;
