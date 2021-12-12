const data = require('../data/pokemon.json');
const moves = require('../data/moves.json');
const { MessageEmbed } = require('discord.js');

class Pokemon {
    constructor(name, level = 1) {
        this.name = name;
        this.level = level;
        this.moves = moves[this.name];
        Object.assign(this, data[name]);
    }

    capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    getEvolution(level) {
        let evo = Object.keys(this.evolutions).reverse().find(lv => lv <= level);

        if (!evo) {
            evo = Object.keys(this.evolutions)[0];
        }

        return this.evolutions[evo];
    }

    getValue({ atk_type, atk_modifier, lvl_modifier, addend }) {
        if (!atk_type) {
            if (this.tags.damage === 'Physical') {
                atk_type = 'attack';
            } else {
                atk_type = 'sp_attack';
            }
        }

        return `${(this.stats.levels[this.level][atk_type] * atk_modifier) + lvl_modifier * (this.level - 1) + addend}`;
    }

    getCooldown(cd, cdr) {
        return `${cd * (1 - cdr)}s`;
    }

    getMove(move_name) {
        const move = this.moves.find(({ aliases }) => aliases.includes(move_name));

        if (!move) return `No move by the name of ${move_name} found`;

        const { aliases: [ skillcode ], name, level, cd, type, desc, fields } = move;

        if (this.level === 1) this.level = level;

        const { cdr } = this.stats.levels[this.level];

        const embed = new MessageEmbed();

        embed.setAuthor(name, `https://github.com/Azuriru/Unity/raw/master/assets/skill_icons/${this.name}/${skillcode}.png`);
        embed.setDescription(desc);
        embed.setFields(
            [
                ...fields.flatMap(({ title, value, calc_variables, type }) => {
                    switch(type) {
                        case 'inline':
                            return [
                                {
                                    name: title,
                                    value,
                                    inline: true
                                },
                                {
                                    name: 'Value',
                                    value: this.getValue(calc_variables),
                                    inline: true
                                }
                            ]
                        case 'data':
                            return [
                                {
                                    name: title,
                                    value
                                }
                            ]
                    }
                }),
                {
                    name: 'Cooldown',
                    value: this.getCooldown(cd, cdr),
                    inline: true
                },
                {
                    name: 'Type',
                    value: this.capitalize(type),
                    inline: true
                }
            ]
        );
        embed.setImage(`https://github.com/Azuriru/Unity/raw/master/assets/skills/${this.name}/${skillcode}.png`);
        embed.setFooter(`${this.capitalize(this.name)} • Level ${this.level}`, `https://github.com/Azuriru/Unity/raw/master/assets/avatar/${this.getEvolution(this.leve)}.png`)
        embed.setTimestamp()

        return { embeds: [ embed ] };
    }
}

module.exports = Pokemon;