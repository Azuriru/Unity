const { spawn } = require('child_process');
const got = require('got');
const OPCommand = require('../structs/OPCommand.js');

class RestartCommand extends OPCommand {
    constructor(bot) {
        super(bot);
        this.aliases = ['restart', 'r'];
        this.hidden = true;

        this.shortdesc = `Restarts the bot.`;
        this.desc = `
            Restarts the bot.
            The bot will send another message once the restart has finished.
            You need to be a bot operator to use this command.`;
        this.usages = [
            '!restart'
        ];
    }

    async call(message) {
        const channelId = message.channel.id;
        await message.channel.send('Restarting...');

        this.restartProc(channelId);
    }

    restartProc(channelId) {
        const subprocess = spawn(
            process.argv0,
            process.argv.slice(1)
                .filter(arg => !arg.startsWith('--last-restart-channel'))
                .concat([`--last-restart-channel=${channelId}`]),
            {
                detached: true,
                stdio: 'ignore'
            }
        );
        subprocess.unref();

        process.exit(0);
    }
}

module.exports = RestartCommand;
