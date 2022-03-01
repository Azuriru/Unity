const Command = require('../structs/Command.js');
const FormatterPlugin = require('../../fmt');
const { MessageEmbed } = require('discord.js');
const pokemons = require('../data/pokemons.json');

class RandomizeCommand extends Command {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

	constructor(bot) {
		super(bot);
		this.aliases = ['randomize', 'random'];
        // this.schema = new SlashCommandBuilder();

        const fmt = this.bot.fmt;
		this.shortdesc = `Randomly gives you a Pokemon.`;
		this.desc = `
            Randomly gives you a Pokemon.
            ${fmt.code('args')} needs to be a list of arguments for the command. Optional but not necessary.
            \`\`\`
            -x, --exclude    Exclude certain Pokemon
            -i, --include    Only include certain Pokemon
            -g, --generate   Increase randomizer results at a time
            \`\`\`
        `;
		this.usages = [
			'!random [args]',
			'!randomize [args]'
		];
        this.examples = [
            '!random -g 2',
            '!random -x zeraora',
            '!randomize -x absol cramorant -g 4',
            '!randomize -i absol cinderace mamoswine mr.mime -g 2',
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

        const args = this.parseArgs(content.toLowerCase());
        let list = Object.keys(pokemons);
        let generateNumber = 1;
        let result = [];

        for (const [ key, value ] of args) {
            switch (key) {
                case 'x':
                case 'exclude':
                    list = list.filter(mon => value.indexOf(mon) === -1);
                    break;
                case 'i':
                case 'include':
                    list = value;
                    break;
                case 'g':
                case 'generate':
                    generateNumber = Number(value);
            }
        }

        if (generateNumber > pokemons.length) {
            await message.channel.send(`You are requesting to generate more than the amount I have. Just run it twice if you don't mind duplicates`);
        }

        while (generateNumber--) {
            const random = this.randomize(list);
            result.push(random);
            list = list.filter(mon => random !== mon);
        }

        const embed = new MessageEmbed()
            .setTitle('Randomizer')
            .setDescription(`
            We randomly generated:\n
            ${result.map(mon => mon.charAt(0).toUpperCase() + mon.slice(1)).join('\n')}
        `)
            .setFooter(`Requested by ${user}`, avatar)
            .setTimestamp();

        await message.channel.send({
            embeds: [
                embed
            ]
        });
	}

    randomize(arr) {
        const i = Math.floor(Math.random() * arr.length);

        return arr[i];
    }

    parseArgs(string) {
        const entries = string.split('-');

        const keyValuePairs = entries.map(entry => {
            const [ key, ...value ] = entry.trim().split(' ');

            return [ key.toLowerCase(), value ];
        });

        const properties = keyValuePairs.filter(Boolean);

        return properties;
    }
}

module.exports = RandomizeCommand;