const Command = require('./Command.js');

class OPCommand extends Command {
    constructor(bot) {
        super(bot);
        this.priority = 4;
    }

    filter(message) {
        return this.isOperator(message);
    }
}

module.exports = OPCommand;
