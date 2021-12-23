const held_items = require('../data/held-items.json');
const battle_items = require('../data/battle-items.json');

class HeldItem {
    constructor(name, level = 1) {
        this.level = level;
        this.tier = this.getCurrentTier();
        Object.assign(this, held_items.find(({ aliases }) => aliases.includes(name.toLowerCase())));
    }

    getCurrentBoosts() {
        return this.stats.map(({ label, percent, float, initial, start, skip, increment, initial_diff }) => {
            let stat = this.level > 1 ? this.level * increment : initial;

            if (skip > 0 && 0 === start && this.level > 1) {
                stat = Math.floor((this.level + 1) / 2) * increment;
            }

            if (skip > 0 && 1 === start && this.level > 1) {
                stat = Math.floor(this.level / 2) * increment;
            }

            if (initial_diff > 0 && this.level > 1) {
                stat += initial_diff;
            }

            return `${label} +${stat.toFixed(float)}${percent ? '%' : ''}`;
        });
    }

    getCurrentTier() {
        if (this.level < 10) {
            return 0;
        } else if (this.level < 20) {
            return 1;
        } else {
            return 2;
        }
    }
}

class BattleItem {
    constructor(name) {
        Object.assign(this, battle_items[name]);
    }

    getCooldown() {
        if (this.cooldown > 60) {
            return `${Math.floor(this.cooldown % 3600 / 60)}m ${Math.floor(this.cooldown % 60)}s`;
        } else {
            return `${this.cooldown}s`;
        }
    }
}

module.exports = {
    HeldItem,
    BattleItem
};