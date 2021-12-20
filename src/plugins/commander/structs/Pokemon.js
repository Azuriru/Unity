const data = require('../data/pokemon.json');

class Pokemon {
    constructor(name, level = 1) {
        this.name = name;
        this.level = level;
        this.abilities = abilities[this.name];
        Object.assign(this, data[name]);
    }

    capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    getEvolution(level) {
        return this.evolutions[Object.keys(this.evolutions).reverse().find(lv => lv <= level)];
    }

    getValue({ atk_type, atk_modifier, lvl_modifier, addend }, percentage_only) {
        if (!atk_type) {
            if (this.tags.damage === 'Physical') {
                atk_type = 'attack';
            } else {
                atk_type = 'sp_attack';
            }
        }

        if (percentage_only) {
            return `${Math.round((this.stats.levels[this.level - 1][atk_type] * atk_modifier))}`;
        }

        return `${Math.round((this.stats.levels[this.level - 1][atk_type] * atk_modifier) + lvl_modifier * (this.level - 1) + addend)}`;
    }

    getCooldown(cd, cdr, isUnite) {
        if (isUnite) {
            return `${Math.floor(cd % 3600 / 60)}m ${Math.floor(cd % 60)}s`;
        } else {
            return `${Number(cd * (1 - cdr)).toFixed()}s`;
        }
    }
}

module.exports = Pokemon;