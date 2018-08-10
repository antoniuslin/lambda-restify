"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function once(fn) {
    // tslint:disable-next-line:only-arrow-functions
    const f = function () {
        if (f.called) {
            return f.value;
        }
        f.called = true;
        return f.value = fn.apply(null, arguments);
    };
    f.called = false;
    return f;
}
exports.default = once;
