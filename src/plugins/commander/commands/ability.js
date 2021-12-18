const Command = require('../structs/Command.js');
const Pokemon = require('../structs/Pokemon.js');

class AbilityCommand extends Command {
	constructor(bot) {
		super(bot);
		this.aliases = ['ability', 'passive',];
        // this.schema = new SlashCommandBuilder();
		this.shortdesc = `Provides useful information about a Pokemon's ability.`;
		this.desc = `
            Provides useful information about a Pokemon's ability.
            Pokemon name must be present.
            When calling the ability of a pre-evolution, simply call their final form.
        `;
		this.usages = [
			'!ability [POKEMON]',
			'!passive [POKEMON]'
		];
        this.examples = [
            '!ability absol',
            '!passive cinderace'
        ]
	}

	async call(message, content) {
        const [ pokemon_name, level ] = content.split(' ');

        if (!pokemon_name) return message.channel.send(`You need to specify a Pokemon.`);

        const pokemon = new Pokemon(pokemon_name, level);
        const abilities = pokemon.getAbility();

        message.channel.send(abilities);
	}
}

module.exports = AbilityCommand;