const held_items = require('../data/held-items.json');
const battle_items = require('../data/battle-items.json');

class HeldItem {
    constructor(name, level = 1) {
        this.level = level;
        Object.assign(this, held_items[name]);
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