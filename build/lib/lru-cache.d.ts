export default class LruCache {
    private items;
    private itemKeys;
    private max;
    constructor(opts: any);
    has(key: string): boolean;
    get(key: string, defaultValue?: any): any;
    set(key: string, value: any): this;
    del(key: string): this;
    private makeKeyRecent;
}
