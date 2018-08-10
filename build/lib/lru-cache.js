"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class LruCache {
    constructor(opts) {
        this.max = opts.max || 100;
        this.items = new Map();
        this.itemKeys = [];
    }
    has(key) {
        return this.items.has(key);
    }
    get(key, defaultValue) {
        if (!this.has(key)) {
            return defaultValue;
        }
        this.makeKeyRecent(key);
        return this.items.get(key);
    }
    set(key, value) {
        this.makeKeyRecent(key);
        this.items.set(key, value);
        return this;
    }
    del(key) {
        const ik = this.itemKeys.indexOf(key);
        if (ik >= 0) {
            this.itemKeys.splice(ik, 1);
        }
        this.items.delete(key);
        return this;
    }
    makeKeyRecent(key) {
        const index = this.itemKeys.indexOf(key);
        if (index === 0) {
            // already most recent
            return;
        }
        if (index > 0) {
            // has, but not first
            this.itemKeys.splice(index, 1);
            this.itemKeys.unshift(key);
        }
        else {
            // doesnt have
            this.itemKeys.unshift(key);
            if (this.itemKeys.length > this.max) {
                this.del(this.itemKeys.pop());
            }
        }
    }
}
exports.default = LruCache;
