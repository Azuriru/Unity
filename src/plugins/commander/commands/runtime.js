const Command = require('../structs/Command.js');

class RuntimeCommand extends Command {
    constructor(bot) {
        super(bot);
        this.aliases = ['runtime', 'uptime'];

        this.shortdesc = `Outputs the bot's runtime`;
        this.desc = `Replies with how many days, hours, minutes, and seconds the bot has been up for.`;
        this.usages = [
            '!runtime'
        ];
    }

    toDurationString(ms) {
        const f = Math.floor;
        const s = f(ms / 1000);
        const m = f(s / 60);
        const h = f(m / 60);
        const d = f(h / 24);

        const p = (n, singular, plural) => n === 1 ? singular : plural;

        const parts = [];

        if (d !== 0) parts.push(`${d} ${p(d, 'day', 'days')}`);
        if (h % 24 !== 0) parts.push(`${h % 24} ${p(h, 'hour', 'hours')}`);
        if (m % 60 !== 0) parts.push(`${m % 60} ${p(m, 'minute', 'minutes')}`);
        if (s % 60 !== 0) parts.push(`${s % 60} ${p(s, 'second', 'seconds')}`);

        switch (parts.length) {
            case 0:
                return '0 seconds';
            case 1:
                return parts[0];
            case 2:
                return parts.join(' and ');
            default:
                return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
        }
    }

    async call(message) {
        const runtime = this.toDurationString(this.bot.client.uptime);

        await message.channel.send(`Bot has been up and running for ${runtime}!`);
    }
}

module.exports = RuntimeCommand;
