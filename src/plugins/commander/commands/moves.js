const Command = require('../structs/Command.js');
const FormatterPlugin = require('../../fmt');
const Pokemon = require('../structs/Pokemon.js');
const { MessageEmbed } = require('discord.js');
const { SERVICE_URL: url } = require('../../../util/config');
const names = require('../data/pokemons.json');

const pokemon_names = Object.keys(names);
const pokemon_aliases = Object.values(names).flat();
const pokemons = [...pokemon_names, ...pokemon_aliases];

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

    capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
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

        const pokemon_moves = require(`../data/moves/${pokemon_name}.json`);

        if (!pokemon_moves) {
            await message.channel.send(`Moves for ${this.capitalize(pokemon_name)} has not been implemented yet. Check back later.`);
            return;
        }

        content = content.slice(pokemon_alias.length + 1);

        if (!content) {
            await message.channel.send(`You need to specify a move name.`);
            return;
        }

        let level = content.split(' ').slice(-1)[0];

        if (Number(level)) {
            content = content.slice(0, -level.length - 1);
        } else {
            level = undefined;
        }

        const move = pokemon_moves.find(({ name, aliases }) => {
            name = name.toLowerCase();
            if (content.startsWith(name) || content.startsWith(name.replace(/ /g, ''))) return true;

            if (aliases.find(alias => content.startsWith(alias))) return true;
        });

        if (!move) {
            await message.channel.send(`No moves matching \`${content}\` was found for ${this.capitalize(pokemon_name)}`);
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

        const pokemon = new Pokemon(pokemon_name, level && Number(level));
        const { aliases: [ skillcode ], name, level: lvl, cd, type, desc, fields } = move;
        let title = name;

        if (!level) {
            pokemon.level = lvl;
        };

        if (skillcode === 'u') {
            title = `Unite Move: ${name}`;
        }

        const { cdr } = pokemon.stats.levels[pokemon.level - 1];

        const embed = new MessageEmbed()
            .setAuthor(title, `${url}/pokemon/skills/icons/${pokemon.name}/${skillcode}.png`)
            .setDescription(desc)
            .setFields(
                [
                    ...fields ? fields.flatMap(({ title, value, calc_variables, type }) => {
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
                    }) : [],
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
                        value: this.getType(type),
                        inline: true
                    }
                ].filter(Boolean)
            )
            .setImage(`${url}/pokemon/skills/previews/${pokemon.name}/${skillcode}.png`)
            .setFooter(`${pokemon.capitalize(pokemon.getEvolution(pokemon.level) || pokemon.name)} • Level ${pokemon.level}`, `${url}/pokemon/avatar/${pokemon.getEvolution(pokemon.level)}.png`)
            .setTimestamp();

        await message.channel.send({
            embeds: [
                embed
            ]
        });
	}

    getType(type) {
        switch(type) {
            case 'area':
                return `<:area:925017057576255508> Area`;
            case 'buff':
                return `<:buff:925017057681084428> Buff`;
            case 'dash':
                return `<:dash:925017057395879987> Dash`;
            case 'debuff':
                return `<:debuff:925017057983078480> Debuff`;
            case 'hindrance':
                return `<:hindrance:925017057894989874> Hindrance`;
            case 'melee':
                return `<:melee:925017057995653150> Melee`;
            case 'ranged':
                return `<:ranged:925017057744015410> Ranged`;
            case 'recovery':
                return `<:recovery:925017057886625822> Recovery`;
            case 'sure-hit':
                return `<:surehit:925017058004070430> Sure-Hit`;
        }
    }
}

module.exports = MovesCommand;
