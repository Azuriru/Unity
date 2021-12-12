const Collection = require('./Collection.js');

class Cache extends Collection {
    get(key, generator) {
        if (!this.has(key)) {
            const val = generator();
            this.set(key, val);
            return val;
        }

        return super.get(key);
    }

    getAll(generators) {
        const object = {};

        for (const key in generators) {
            object[key] = this.get(key, generators[key]);
        }

        return object;
    }
}

module.exports = Cache;
