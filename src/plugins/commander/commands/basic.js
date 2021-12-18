const Command = require('../structs/Command.js');
const Pokemon = require('../structs/Pokemon.js');

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
            If no level is provided for the basic ability, it defaults to level 1
        `;
		this.usages = [
			'!basic [POKEMON] [LEVEL]',
			'!boosted [POKEMON] [LEVEL]'
		];
        this.examples = [
            '!basic absol 4',
            '!boosted cinderace 9'
        ]
	}

	async call(message, content) {
        const [ pokemon_name, level ] = content.split(' ');

        if (!pokemon_name) return message.channel.send(`You need to specify a Pokemon.`);

        const pokemon = new Pokemon(pokemon_name, level);
        const abilities = pokemon.getBasicAbility();

        message.channel.send(abilities);
	}
}

module.exports = BasicCommand;