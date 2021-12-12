const { spawn } = require('child_process');
const got = require('got');
const OPCommand = require('../structs/OPCommand.js');

class OperatorCommand extends OPCommand {
    constructor(bot) {
        super(bot);
        this.aliases = ['operator', 'op', 'o'];
        this.hidden = true;
        this.shortdesc = `Temporarily adds a user to the operators list.`;
        this.desc = `
            Temporarily adds a user to the operators list.
            You need to be a bot operator to use this command.`;
        this.usages = [
            '!operator @1'
        ];
    }

    formatUsers(users) {
        if (users.length === 1) {
            return `${users[0]} was`;
        } else {
            const last = users.pop();
            return `${users.join(', ')} and ${last} were`;
        }
      
    }
  
    async call(message, content) {
        const users = message.mentions.users;
        const usernames = [];
        
        if (users.size === 0) {
            await message.channel.send(`You must mention a user to add to the list of operators!`);
        } else {
            for (const user of users.values()) {
                this.bot.operators.push(user.id);
                usernames.push(user.username);
            }
            await message.channel.send(`${this.formatUsers(usernames)} added to the list of operators!`);
        }        
    }
}

module.exports = OperatorCommand;
