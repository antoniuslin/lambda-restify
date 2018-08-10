"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const assert = require("assert");
class Logger {
    constructor(level = 4, stream = process.stdout) {
        this.level = level;
        this.stream = stream;
        assert.ok(typeof level === 'number', "level");
        assert.ok(level >= 1 && level <= 6, "level");
    }
    fatal(...args) {
        return this.log("FATAL", args);
    }
    error(...args) {
        return this.log("ERROR", args);
    }
    warn(...args) {
        return this.log("WARN", args);
    }
    info(...args) {
        return this.log("INFO", args);
    }
    debug(...args) {
        return this.log("DEBUG", args);
    }
    trace(...args) {
        return this.log("TRACE", args);
    }
    log(levelStr, args) {
        if (Logger[levelStr] > this.level) {
            return;
        }
        this.stream.write('[' + new Date() + ']'
            + ' ' + levelStr
            + ' ' + util_1.format.apply(null, args)
            + '\n');
    }
}
Logger.FATAL = 1;
Logger.ERROR = 2;
Logger.WARN = 3;
Logger.INFO = 4;
Logger.DEBUG = 5;
Logger.TRACE = 6;
exports.default = Logger;
