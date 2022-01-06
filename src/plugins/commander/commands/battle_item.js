const Command = require('../structs/Command.js');
const { BattleItem } = require('../structs/Item.js');
const { MessageEmbed } = require('discord.js');
const { SERVICE_URL: url } = require('../../../util/config');
const items = require('../data/battle-items.json');

class BattleItemCommand extends Command {
	constructor(bot) {
		super(bot);
		this.aliases = ['battle-item', 'battleitem', 'bitem', 'bi'];
        // this.schema = new SlashCommandBuilder();
		this.shortdesc = 'Provides useful information about a battle item.';
		this.desc = `
            Provides useful information about a held item.
            Case insensitive.
        `;
		this.usages = [
			'!battle-item [item]',
            '!battleitem [item]',
            '!bitem [item]'
		];
        this.examples = [
			'!battle-item fullheal',
            '!battleitem potion',
            '!bitem xattack'
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

        const battle_item_name = content.replace(/ /g, '').toLowerCase();

        if (!battle_item_name) {
            await message.channel.send(`You need to specify a battle item.`);
            return;
        }

        if (Object.keys(items).indexOf(battle_item_name) === -1) {
            await message.channel.send(`No Battle Item by the name of ${battle_item_name} found.`);
            return;
        }

        const item = items[battle_item_name];
        const battle_item = new BattleItem(battle_item_name);

        if (!item) {
            await message.channel.send(`Details about ${battle_item_name} has not been implemented yet. Check back later.`);
            return;
        }

        const { name, description, unlock_level } = battle_item;

        await message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setAuthor(name, `${url}/battle-items/rounded/${battle_item_name}.png`)
                    .setThumbnail(`https://raw.githubusercontent.com/Azuriru/Unity/master/assets/battle-items/icons/${battle_item_name}.png`)
                    .setDescription(`
                        ${description}

                        Unlocks at Trainer Level ${unlock_level}.
                    `)
                    .setImage(`https://raw.githubusercontent.com/Azuriru/Unity/master/assets/battle-items/previews/${battle_item_name}.png`)
                    .addField('Cooldown', battle_item.getCooldown())
                    .setFooter(`Requested by ${user}`, avatar)
                    .setTimestamp()
            ]
        });
	}
}

module.exports = BattleItemCommand;