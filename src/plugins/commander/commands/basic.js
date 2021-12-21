const Command = require('../structs/Command.js');
const Pokemon = require('../structs/Pokemon.js');
const { MessageEmbed } = require('discord.js');
const names = require('../data/pokemons.json');
const basic_abilities = require('../data/basic-abilities.json');

class BasicCommand extends Command {
	constructor(bot) {
		super(bot);
		this.aliases = ['basic', 'boosted', 'b'];
        // this.schema = new SlashCommandBuilder();
		this.shortdesc = `Provides useful information about a Pokemon's basic ability.`;
		this.desc = `
            Provides useful information about a Pokemon's basic ability.
            Pokemon name must be present.
            When calling the ability of a pre-evolution, simply call their final form.
            If no level is provided for the basic ability, it defaults to level 1.
            Default embed may be ugly looking for mobile. Add -m infront of the message to signify a mobile embed.
        `;
		this.usages = [
			'!basic [POKEMON] [LEVEL]',
			'!boosted [POKEMON] [LEVEL]',
            '!basic -m [POKEMON] [LEVEL]',
            '!boosted -m [POKEMON] [LEVEL]'
		];
        this.examples = [
            '!basic absol 4',
            '!boosted cinderace 9',
            '!basic -m sylveon 8'
        ]
	}

	async call(message, content) {
        let mobile = false;
        if (content.toLowerCase().slice(0, 3) === '-m ') {
            content = content.slice(3);
            mobile = true;
        }

        const [ pokemon_name, level ] = content.toLowerCase().split(' ');

        if (!pokemon_name) return message.channel.send(`You need to specify a Pokemon.`);

        if (names.indexOf(pokemon_name) === -1) return message.channel.send(`No Pokemon by the name of ${pokemon_name} found.`);

        const pokemon = new Pokemon(pokemon_name, level);
        const pokemon_basic_abilities = basic_abilities[pokemon_name];

        if (!pokemon_basic_abilities) return message.channel.send(`Basic abilities for ${pokemon.capitalize(pokemon.name)} has not been implemented yet. Check back later.`);

        const embeds = pokemon_basic_abilities.map(({ desc, fields, evolution }) => {
            const embed = new MessageEmbed();

            embed.setAuthor('Basic Ability', `https://raw.githubusercontent.com/Azuriru/Unity/master/assets/skill-icons/basic-attack.png`);
            embed.setDescription(desc);
            fields && embed.setFields(
                fields.flatMap(({ title, value, calc_variables, variables, type }) => {
                    switch(type) {
                        case 'inline':
                            return [
                                {
                                    name: title,
                                    value: mobile
                                        ? `
                                            **Formula:** ${value}
                                            **Value:** ${pokemon.getValue(calc_variables)}
                                        `
                                        : value,
                                    inline: !mobile
                                },
                                !mobile && {
                                    name: '\u200B',
                                    value: '\u200B',
                                    inline: true
                                },
                                !mobile && {
                                    name: 'Value',
                                    value: pokemon.getValue(calc_variables),
                                    inline: true
                                }
                            ];
                        case 'inline-percentage':
                            return [
                                {
                                    name: title,
                                    value: mobile
                                        ? `
                                            **Formula:** ${value}
                                            **Value:** ${pokemon.getValue(variables, true)}
                                        `
                                        : value,
                                    inline: !mobile
                                },
                                !mobile && {
                                    name: '\u200B',
                                    value: '\u200B',
                                    inline: true
                                },
                                !mobile && {
                                    name: 'Value',
                                    value: pokemon.getValue(variables, true),
                                    inline: true
                                }
                            ];
                        case 'data':
                            return {
                                name: title,
                                value
                            }
                    }
                }).filter(Boolean)
            );
            embed.setFooter(`${pokemon.capitalize(pokemon.name)}`, `https://raw.githubusercontent.com/Azuriru/Unity/master/assets/avatar/${evolution ? `${evolution}` : pokemon.name}.png`);
            embed.setTimestamp();

            return embed;
        });

        message.channel.send({ embeds });
	}
}

module.exports = BasicCommand;