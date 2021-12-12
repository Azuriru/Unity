const Command = require('../structs/Command.js');
const FormatterPlugin = require('../../fmt');
const Pokemon = require('../structs/Pokemon.js');

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
        `;
		this.usages = [
			'!move [POKEMON] [MOVENAME]',
			'!move [POKEMON] [MOVENAME] [LEVEL]',
		];
        this.examples = [
            '!move absol pursuit',
            '!move absol s12 9',
            '!move absol unite',
        ]
	}

	async call(message, content) {
        const [ pokemon_name, move_name, level ] = content.split(' ');

        if (!pokemon_name) return message.channel.send(`You need to specify a Pokemon.`);
        if (!move_name) return message.channel.send(`You need to specify a move name.`);

        const pokemon = new Pokemon(pokemon_name, level);
        const move = pokemon.getMove(move_name.toLowerCase());

        message.channel.send(move);
	}
}

module.exports = MovesCommand;