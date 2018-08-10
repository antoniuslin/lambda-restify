/// <reference types="node" />
export declare type LevelType = 1 | 2 | 3 | 4 | 5 | 6;
export default class Logger {
    private level;
    private stream;
    static readonly FATAL: number;
    static readonly ERROR: number;
    static readonly WARN: number;
    static readonly INFO: number;
    static readonly DEBUG: number;
    static readonly TRACE: number;
    constructor(level?: LevelType, stream?: NodeJS.WriteStream);
    fatal(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
    trace(...args: any[]): void;
    private log;
}
