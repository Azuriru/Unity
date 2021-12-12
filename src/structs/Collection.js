const EventEmitter = require('events');

class Collection extends Map {
    constructor(iter) {
        // if (Array.isArray(iter)) {
        //     iter = Object.entries(iter);
        // }
        super(iter);

        Object.defineProperty(this, '_array', {
            value: null,
            writable: true,
            configurable: true
        });
        Object.defineProperty(this, '_emitter', {
            value: new EventEmitter(),
            writable: true,
            configurable: true
        });
    }

    get length() {
        return this.size;
    }

    uncache() {
        this._array = null;
        this._keyArray = null;
    }

    set(key, val) {
        this.uncache();
        return super.set(key, val);
    }

    delete(key) {
        this.uncache();
        return super.delete(key);
    }

    setAll(obj) {
        this.uncache();
        for (const key in obj) {
            super.set(key, obj[key]);
        }
    }

    deleteAll(keys) {
        this.uncache();
        for (const i in keys) {
            super.delete(keys[i]);
        }
    }

    getDelete(key) {
        const val = this.get(key);
        this.delete(key);
        return val;
    }

    on(event, fn) {
        this._emitter.on(event, fn);
    }

    once(event, fn) {
        this._emitter.once(event, fn);
    }

    off(event, fn) {
        if (!fn) {
            this._emitter.removeAllListeners();
            return;
        }
        this._emitter.off(event, fn);
    }

    emit(event, ...args) {
        this._emitter.emit(event, ...args);
    }

    array() {
        return this._array || (this._array = Array.from(this.values()));
    }

    keyArray() {
        return this._keyArray || (this._keyArray = Array.from(this.keys()));
    }

    first(count) {
        if (!count) {
            return this.values().next().value;
        }
        return this.slice(0, count);
    }

    last(count) {
        if (!count) {
            return this.slice(-1)[0];
        }
        return this.slice(-count);
    }

    slice(start, end) {
        return this.array().slice(start, end);
    }

    firstKey() {
        const key = this.keys().next().value;
        if (!key) return null;
        return key;
    }

    lastKey() {
        const keys = this.keyArray();
        if (!keys.length) return null;
        return keys[keys.length - 1];
    }

    shift() {
        const key = this.firstKey();
        if (!key) return null;
        return this.getDelete(key);
    }

    shiftEntry() {
        const key = this.firstKey();
        if (!key) return null;
        return [key, this.getDelete(key)];
    }

    pop() {
        const key = this.lastKey();
        if (!key) return null;
        return this.getDelete(key);
    }

    popEntry() {
        const key = this.lastKey();
        if (!key) return null;
        return [key, this.getDelete(key)];
    }

    find(fn, dis) {
        if (dis) fn = fn.bind(dis);
        for (const [key, value] of this) {
            if (fn(value, key, this)) return value;
        }
    }

    findKey(fn, dis) {
        if (dis) fn = fn.bind(dis);
        for (const [key, value] of this) {
            if (fn(value, key, this)) return key;
        }
    }

    findBy(prop, val) {
        return this.find(entry => entry[prop] === val);
    }

    filter(fn, dis) {
        if (dis) fn = fn.bind(dis);
        const filtered = new this.constructor();
        for (const [key, value] of this) {
            if (fn) filtered.set(key, value);
        }
        return filtered;
    }

    map(fn, dis) {
        if (dis) fn = fn.bind(dis);
        const copy = this.copy();
        for (const [key, val] of this) {
            copy.set(key, fn(key, val, this));
        }
        return copy;
    }

    each(fn, dis) {
        this.forEach(fn, dis);
        return this;
    }

    sort(compareFunction = (x, y) => +(x > y) || +(x === y) - 1) {
      return new this.constructor([...this.entries()].sort((a, b) => compareFunction(a[1], b[1], a[0], b[0])));
    }

    copy() {
        return new this.constructor(this);
    }

    json() {
        var obj = {};
        this.forEach((value, key) => obj[key] = value);
        return JSON.stringify(obj);
    }
}

module.exports = Collection;
