const Command = require('../structs/Command.js');
const FormatterPlugin = require('../../fmt');
const { MessageEmbed } = require('discord.js');
// const items = require('../data/items.json');

const items = {};

class HeldItemsCommand extends Command {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

	constructor(bot) {
		super(bot);
        const fmt = this.bot.fmt;
		this.aliases = ['held-item', 'helditem', 'he'];
        // this.schema = new SlashCommandBuilder();
		this.shortdesc = 'Provides useful information about a held item.';
		this.desc = `
            Provides useful information about a held item.
            Item name must be conjoined. Case insensitive.
            If no level is provided, it defaults to 20.
        `;
		this.usages = [
			'!held-item [ITEM] [LEVEL]',
            '!helditem [ITEM] [LEVEL]',
            '!he [ITEM] [LEVEL]'
		];
        this.examples = [
            '!held-item BuddyBarrier',
            '!helditem assaultvest 30',
            '!he ScopeLens 10'
        ]
	}

	async call(message, content) {
        const [ held_item_name, level ] = content.toLowerCase().split(' ');

        if (!held_item_name) {
            await message.channel.send(`You need to specify a held item.`);
            return;
        }

        if (Object.keys(items).indexOf(held_item_name) === -1) {
            await message.channel.send(`No Held Item by the name of ${held_item_name} found.`);
            return;
        }

        const item = items[held_item_name];
        const held_item = new HeldItem(held_item, level);

        if (!item) {
            await message.channel.send(`Stats for ${held_item.name} has not been implemented yet. Check back later.`);
            return;
        }

        const embed = new MessageEmbed();
        await message.channel.send({
            embeds: [
                embed
            ]
        });
	}
}

module.exports = HeldItemsCommand;