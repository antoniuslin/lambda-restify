export declare function promiseFromCallback<T>(next: (next: (err: Error | null, value?: T) => any) => any): Promise<T>;
