const OPCommand = require('../structs/OPCommand.js');

class TestCommand extends OPCommand {
    constructor(bot) {
        super(bot);
        this.aliases = ['test'];

        this.shortdesc = `Replies.`;
        this.desc = `
            Replies with "Tested!", as to confirm the bot is, indeed, running.
            You need to be an operator in order to use this command.`;
        this.usages = [
            '!test'
        ];
    }

    async call(message) {
        await message.channel.send('Tested!');
    }
}

module.exports = TestCommand;
