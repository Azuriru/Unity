const Command = require('../structs/Command.js');
const FormatterPlugin = require('../../fmt');
const Pokemon = require('../structs/Pokemon.js');
const { MessageEmbed } = require('discord.js');
const { SERVICE_URL: url } = require('../../../util/config');
const names = require('../data/pokemons.json');
const moves = require('../data/moves.json');

class MovesCommand extends Command {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

	constructor(bot) {
		super(bot);
        const fmt = this.bot.fmt;
		this.aliases = ['move', 'm'];
        // this.schema = new SlashCommandBuilder();
		this.shortdesc = 'Provides useful information about a move.';
		this.desc = `
            Provides useful information about a move from a Pokemon.
            Pokemon name must be present as there are many moves with the same name used by different pokemon.
            Move names must contain no space. "Midnight Slash" should be "MidnightSlash" or "midnightslash".
            Move names can also be their in-game codes, such as ${fmt.code('S01')}, ${fmt.code('S12')}, etc.
            Unite moves can be called with ${fmt.code('unite')} or ${fmt.code('u')}.
            If no level is provided, it defaults to the level the pokemon learns that move.
            Default embed may be ugly looking for mobile. Add -m infront of the message to signify a mobile embed.
        `;
		this.usages = [
			'!move [POKEMON] [MOVENAME]',
			'!move [POKEMON] [MOVENAME] [LEVEL]',
			'!move -m [POKEMON] [MOVENAME]',
			'!move -m [POKEMON] [MOVENAME] [LEVEL]'
		];
        this.examples = [
            '!move absol pursuit',
            '!move absol s12 9',
            '!move absol unite',
            '!move -m absol psychocut'
        ]
	}

	async call(message, content) {
        let mobile = false;
        if (content.toLowerCase().slice(0, 3) === '-m ') {
            content = content.slice(3);
            mobile = true;
        }

        const [ pokemon_name, move_name, level ] = content.toLowerCase().split(' ');

        if (!pokemon_name) {
            await message.channel.send(`You need to specify a Pokemon.`);
            return;
        }

        if (!move_name) {
            await message.channel.send(`You need to specify a move name.`);
            return;
        }

        if (level < 1) {
            await message.channel.send(`Pokémon level cannot be lower than 1.`);
            return;
        }

        if (level > 15) {
            await message.channel.send(`Pokémon level cannot be higher than 15.`);
            return;
        }

        if (names.indexOf(pokemon_name) === -1) {
            await message.channel.send(`No Pokemon by the name of ${pokemon_name} found.`);
            return;
        }

        const pokemon = new Pokemon(pokemon_name, level && Number(level));
        const pokemon_moves = moves[pokemon_name];

        if (!pokemon_moves) {
            await message.channel.send(`Moves for ${pokemon.capitalize(pokemon.name)} has not been implemented yet. Check back later.`);
            return;
        }

        const move = pokemon_moves.find(({ aliases }) => aliases.includes(move_name));

        if (!move) {
            await message.channel.send(`No move by the name of \`${move_name}\` was found for ${pokemon.capitalize(pokemon.name)}`);
            return;
        }

        const { aliases: [ skillcode ], name, level: lvl, cd, type, desc, fields } = move;
        let title = name;

        if (!level) {
            pokemon.level = lvl;
            console.log('no level');
        };

        if (skillcode === 'u') {
            title = `Unite Move: ${name}`;
        }

        const { cdr } = pokemon.stats.levels[pokemon.level - 1];

        const embed = new MessageEmbed();
        embed.setAuthor(title, `${url}/pokemon/skills/icons/${pokemon.name}/${skillcode}.png`);
        embed.setDescription(desc);
        embed.setFields(
            [
                ...fields.flatMap(({ title, value, calc_variables, type }) => {
                    switch(type) {
                        case 'inline':
                            return [
                                {
                                    name: title,
                                    value: mobile
                                        ? `
                                            **Formula:** ${value}
                                            **Value: **${pokemon.getValue(calc_variables)}
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
                }),
                {
                    name: 'Cooldown',
                    value: pokemon.getCooldown(cd, cdr, skillcode === 'u'),
                    inline: true
                },
                !mobile && {
                    name: '\u200B',
                    value: '\u200B',
                    inline: true
                },
                {
                    name: 'Type',
                    value: pokemon.capitalize(type),
                    inline: true
                }
            ].filter(Boolean)
        );
        embed.setImage(`${url}/pokemon/skills/previews/${pokemon.name}/${skillcode}.png`);
        embed.setFooter(`${pokemon.capitalize(pokemon.getEvolution(pokemon.level) || pokemon.name)} • Level ${pokemon.level}`, `${url}/pokemon/avatar/${pokemon.getEvolution(pokemon.level)}.png`);
        embed.setTimestamp();

        await message.channel.send({
            embeds: [
                embed
            ]
        });
	}
}

module.exports = MovesCommand;