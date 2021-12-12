const Command = require('./Command.js');

class ModCommand extends Command {
    constructor(bot) {
        super(bot);
        this.priority = 1;
    }

    filter(message) {
        return this.isModerator(message);
    }
}

module.exports = ModCommand;
