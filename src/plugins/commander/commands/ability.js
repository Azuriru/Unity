const Command = require('../structs/Command.js');
const Pokemon = require('../structs/Pokemon.js');
const { MessageEmbed } = require('discord.js');
const { SERVICE_URL: url } = require('../../../util/config');
const names = require('../data/pokemons.json');
const abilities = require('../data/abilities.json');

const pokemon_names = Object.keys(names);
const pokemon_aliases = Object.values(names).flat();
const pokemons = [...pokemon_names, ...pokemon_aliases];

class AbilityCommand extends Command {
	constructor(bot) {
		super(bot);
		this.aliases = ['ability', 'passive'];
        // this.schema = new SlashCommandBuilder();
		this.shortdesc = `Provides useful information about a Pokemon's ability.`;
		this.desc = `
            Provides useful information about a Pokemon's ability.
            Pokemon name must be present.
            When calling the ability of a pre-evolution, simply call their final form.
            Default embed may be ugly looking for mobile. Add -m infront of the message to signify a mobile embed.
        `;
		this.usages = [
			'!ability [pokemon]',
			'!passive [pokemon]',
			'!ability -m [pokemon]',
			'!passive -m [pokemon]'
		];
        this.examples = [
            '!ability absol',
            '!passive cinderace',
            '!ability -m crustle'
        ]
	}

	async call(message, content) {
        let mobile = false;
        content = content.toLowerCase();
        if (content.slice(0, 3) === '-m ') {
            content = content.slice(3);
            mobile = true;
        }

        if (!content) {
            await message.channel.send(`You need to specify a Pokemon.`);
            return;
        }

        let pokemon_alias;
        for (const pokemon of pokemons) {
            if (content.startsWith(`${pokemon}`)) {
                pokemon_alias = pokemon;
                break;
            }
        }

        const pokemon_name = pokemon_names.find(name => name === pokemon_alias) || pokemon_names.find(name => names[name].includes(pokemon_alias));

        if (!pokemon_name) {
            await message.channel.send(`No Pokemon by the name of ${pokemon_name} found.`);
            return;
        }

        const level = content.slice(pokemon_alias.length + 1) || undefined;

        if (level < 1) {
            await message.channel.send(`Pokémon level cannot be lower than 1.`);
            return;
        }

        if (level > 15) {
            await message.channel.send(`Pokémon level cannot be higher than 15.`);
            return;
        }

        const pokemon = new Pokemon(pokemon_name, level && Number(level));
        const pokemon_abilities = abilities[pokemon_name];

        if (!pokemon_abilities) {
            await message.channel.send(`Abilities for ${pokemon.capitalize(pokemon.name)} has not been implemented yet. Check back later.`);
            return;
        }

        const embeds = pokemon_abilities.map(({ name, desc, fields, evolution }) => {
            const embed = new MessageEmbed()
                .setAuthor(name, `${url}/pokemon/skills/icons/${pokemon.name}/${evolution && evolution !== pokemon.name ? `ability-${evolution}` : 'ability'}.png`)
                .setDescription(desc);

            if (fields) {
                embed.setFields(
                    fields.flatMap(({ title, value, calc_variables, type }) => {
                        switch(type) {
                            case 'inline':
                                return [
                                    {
                                        name: title,
                                        value: mobile
                                            ? `
                                                **Formula:** ${value}
                                                **Value**:** ${pokemon.getValue(calc_variables)}
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
                            case 'data':
                                return {
                                    name: title,
                                    value
                                };
                        }
                    }).filter(Boolean)
                );
            }

            embed.setFooter(`${pokemon.capitalize(evolution || pokemon.getEvolution(pokemon.level))} • Level ${pokemon.level}`, `https://raw.githubusercontent.com/Azuriru/Unity/master/assets/pokemon/avatar/${evolution || pokemon.getEvolution(pokemon.level)}.png`);
            embed.setTimestamp();

            return embed;
        });

        await message.channel.send({
            embeds
        });
	}
}

module.exports = AbilityCommand;