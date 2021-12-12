const { SlashCommandBuilder } = require('@discordjs/builders');
const Command = require('../structs/Command.js');

class PingCommand extends Command {
	constructor(bot) {
		super(bot);
		this.aliases = ['ping', 'latency', 'lag', 'hyperspeed'];
        this.schema = new SlashCommandBuilder();

		this.DISCORD_EPOCH = 1420070400000;

		this.shortdesc = 'Pings the bot.';
		this.desc = `
					Displays bot latency.
					Calculated via websocket heartbeat and distance between message and reply creation in Discord's side.`;
		this.usages = [
			'!ping'
		];
	}

	async call(message) {
		const line = `:heartbeat: ${this.getPing()}ms`;
		const reply = await message.channel.send(line);
		const time = `:stopwatch: ${this.getSnowflakeTime(reply.id) - this.getSnowflakeTime(message.id)}ms`;

		await reply.edit(`${line}\n${time}`);
	}

	getSnowflakeTime(id) {
		return new Date(Number(BigInt(id) >> 22n) + this.DISCORD_EPOCH).getTime();
	}

	getPing() {
		return this.bot.client.ws.ping;
	}
}

module.exports = PingCommand;
