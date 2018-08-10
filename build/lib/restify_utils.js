"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const formatters_1 = require("./formatters");
const assert = require("assert-plus");
const mime = require("mime");
function createHttpError(msg, code) {
    const e = new Error(msg);
    e.statusCode = code;
    return e;
}
exports.createHttpError = createHttpError;
function httpDate(now) {
    if (!now) {
        now = new Date();
    }
    return now.toUTCString();
}
exports.httpDate = httpDate;
function createFormattersAndAcceptables(fmt) {
    let arr = [];
    const obj = {};
    function addFormatter(src, k) {
        assert.func(src[k], 'formatter');
        let q = 1.0; // RFC 2616 sec14 - The default value is q=1
        let t = k;
        if (k.indexOf(';') !== -1) {
            const tmp = k.split(/\s*;\s*/);
            t = tmp[0];
            if (tmp[1].indexOf('q=') !== -1) {
                q = parseFloat(tmp[1].split('=')[1]);
            }
        }
        if (k.indexOf('/') === -1) {
            k = mime.lookup(k);
        }
        obj[t] = src[k];
        arr.push({ q, t });
    }
    Object.keys(formatters_1.default).forEach(addFormatter.bind(null, formatters_1.default));
    Object.keys(fmt || {}).forEach(addFormatter.bind(null, fmt || {}));
    arr = arr.sort((a, b) => {
        return (b.q - a.q);
    }).map((a) => {
        return (a.t);
    });
    return ({
        formatters: obj,
        acceptable: arr
    });
}
exports.createFormattersAndAcceptables = createFormattersAndAcceptables;
function shallowCopy(obj) {
    if (!obj) {
        return (obj);
    }
    const copy = {};
    Object.keys(obj).forEach((k) => {
        copy[k] = obj[k];
    });
    return copy;
}
exports.shallowCopy = shallowCopy;
function mergeQs(obj1, obj2) {
    const merged = shallowCopy(obj1) || {};
    // defend against null cause null is an object. yay js.
    if (obj2 && typeof (obj2) === 'object') {
        Object.keys(obj2).forEach((key) => {
            // if we already have this key and it isn't an array,
            // make it one array of the same element.
            if (merged.hasOwnProperty(key) && !(merged[key] instanceof Array)) {
                merged[key] = [merged[key]];
                // push the new value down
                merged[key].push(obj2[key]);
            }
            else {
                // otherwise just set it
                merged[key] = obj2[key];
            }
        });
    }
    return merged;
}
exports.mergeQs = mergeQs;
/**
 * Headers that cannot be multi-values.
 * @see #779, don't use comma separated values for set-cookie
 * @see #986, don't use comma separated values for content-type
 * @see http://tools.ietf.org/html/rfc6265#section-3
 */
exports.HEADER_ARRAY_BLACKLIST = {
    'set-cookie': true,
    'content-type': true
};
