const Command = require('../structs/Command.js');
const { HeldItem } = require('../structs/Item.js');
const { MessageEmbed } = require('discord.js');
const items = require('../data/held-items.json');

class HeldItemsCommand extends Command {
	constructor(bot) {
		super(bot);
        const fmt = this.bot.fmt;
		this.aliases = ['held-item', 'helditem', 'he'];
        // this.schema = new SlashCommandBuilder();
		this.shortdesc = 'Provides useful information about a held item.';
		this.desc = `
            Provides useful information about a held item.
            Item name is case insensitive.
            If no level is provided, it defaults to 20.
        `;
		this.usages = [
			'!held-item [ITEM] [LEVEL]',
            '!helditem [ITEM] [LEVEL]',
            '!he [ITEM] [LEVEL]'
		];
        this.examples = [
            '!held-item Buddy Barrier',
            '!helditem assaultvest 30',
            '!he ScopeLens 10'
        ]
	}

	async call(message, content) {
        let target;
        if (message.member) {
            target = message.member
        }

        const user = target
            ? target.nickname || target.user.username
            : message.author.username;
        const avatar = (target ? target.user : message.author).avatarURL({
            format: 'png',
            dynamic: true,
            size: 32
        });

        const args = content.toLowerCase().split(' ');
        let level = 20;

        if (!isNaN(args[args.length - 1])) {
            level = Number(args.pop());
        }

        const held_item_name = args.join('');

        if (!held_item_name) {
            await message.channel.send(`You need to specify a held item.`);
            return;
        }

        if (items.flatMap(e => e.aliases).indexOf(held_item_name) === -1) {
            await message.channel.send(`No Held Item by the name of ${held_item_name} found.`);
            return;
        }

        const item = items.find(({ aliases }) => aliases.includes(held_item_name));
        const held_item = new HeldItem(held_item_name, level);

        if (!item) {
            await message.channel.send(`Stats for ${held_item.name} has not been implemented yet. Check back later.`);
            return;
        }

        const { name, description, passive: { stat, levels: lvl } } = held_item;
        const tier = held_item.getCurrentTier();

        const embed = new MessageEmbed()
            .setAuthor(`${name}`, `https://raw.githubusercontent.com/Azuriru/Unity/master/assets/held-items/tiers/${held_item.aliases[0]}-${['a', 'b', 'c'][tier]}.png`)
            .setDescription(description)
            .setThumbnail(`https://raw.githubusercontent.com/Azuriru/Unity/master/assets/held-items/sprites/${held_item.aliases[0]}.png`)
            .setFields([
                {
                    name: 'Passive',
                    value: `${stat} ${lvl[tier]}`,
                    inline: true
                },
                {
                    name: 'Bonus',
                    value: `${held_item.getCurrentBoosts().join('\n')}`,
                    inline: true
                }
            ])
            .setFooter(`Request by ${user} • Level ${level}`, avatar)
            .setTimestamp();

        await message.channel.send({
            embeds: [
                embed
            ]
        });
	}
}

module.exports = HeldItemsCommand;