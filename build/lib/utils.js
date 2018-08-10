"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function promiseFromCallback(next) {
    return new Promise((resolve, reject) => {
        next((err, value) => {
            if (err) {
                return reject(err);
            }
            resolve(value);
        });
    });
}
exports.promiseFromCallback = promiseFromCallback;
