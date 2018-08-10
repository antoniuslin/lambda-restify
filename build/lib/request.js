"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert-plus");
const mime = require("mime");
const uuid = require("uuid");
const url = require("url");
const util_1 = require("util");
const Negotiator = require('negotiator');
class Request {
    constructor(source, log) {
        this.source = source;
        this.log = log;
        // tslint:disable-next-line:variable-name
        this._meta = {};
        this.headers = {};
        Object.keys(source.headers).map((key) => {
            this.headers[key.toLowerCase()] = source.headers[key];
        });
        this.negotiator = new Negotiator({
            headers: {
                'accept': this.headers.accept || '*/*',
                'accept-encoding': this.headers['accept-encoding'] ||
                    'identity'
            }
        });
        this.url = this.source.path;
        if (this.source.queryStringParameters) {
            const urlObject = url.parse(this.url);
            urlObject.query = Object.assign({}, this.source.queryStringParameters);
            this.url = url.format(urlObject);
        }
        this.startingTime = Date.now();
        this.httpVersion = '2.0';
        if (this.headers.via) {
            this.httpVersion = this.headers.via.split(' ')[0];
        }
        this.method = this.source.httpMethod;
        this.body = this.source.body;
    }
    header(name, value) {
        assert.string(name, 'name');
        name = name.toLowerCase();
        if (name === 'referer' || name === 'referrer') {
            name = 'referer';
        }
        return this.headers[name] || value;
    }
    accepts(types) {
        if (typeof (types) === 'string') {
            types = [types];
        }
        types = types.map((t) => {
            assert.string(t, 'type');
            if (t.indexOf('/') === -1) {
                t = mime.lookup(t);
            }
            return t;
        });
        return this.negotiator.preferredMediaType(types);
    }
    acceptsEncoding(types) {
        if (typeof (types) === 'string') {
            types = [types];
        }
        assert.arrayOfString(types, 'types');
        return this.negotiator.preferredEncoding(types);
    }
    getContentLength() {
        if (this.contentLengthCached !== undefined) {
            return (this.contentLengthCached === false ? undefined : this.contentLengthCached);
        }
        const len = this.header('content-length');
        if (!len) {
            this.contentLengthCached = false;
        }
        else {
            this.contentLengthCached = parseInt(len, 10);
        }
        return this.contentLengthCached === false ? undefined : this.contentLengthCached;
    }
    contentLength() {
        return this.getContentLength();
    }
    getContentType() {
        if (this.contentTypeCached !== undefined) {
            return (this.contentTypeCached);
        }
        let index;
        const type = this.headers['content-type'];
        if (!type) {
            this.contentTypeCached = 'application/octet-stream';
        }
        else {
            index = type.indexOf(';');
            if (index === -1) {
                this.contentTypeCached = type;
            }
            else {
                this.contentTypeCached = type.substring(0, index);
            }
        }
        this.contentTypeCached = this.contentTypeCached.toLowerCase();
        return this.contentTypeCached;
    }
    contentType() {
        return this.getContentType();
    }
    time() {
        return this.startingTime;
    }
    date() {
        return new Date(this.time());
    }
    getQuery() {
        return this.getUrl().query;
    }
    query() {
        return this.getQuery();
    }
    getUrl() {
        if (this.cachedUrl !== this.url) {
            this.cachedUrlObject = url.parse(this.url, true);
            this.cachedUrl = this.url;
        }
        return this.cachedUrlObject;
    }
    href() {
        return this.getUrl().href;
    }
    id(reqId) {
        if (reqId) {
            if (this._id) {
                throw new Error('request id is immutable, cannot be set again!');
            }
            else {
                assert.string(reqId, 'reqId');
                this._id = reqId;
                return this._id;
            }
        }
        return this.getId();
    }
    getId() {
        if (this._id !== undefined) {
            return (this._id);
        }
        this._id = uuid.v4();
        return this._id;
    }
    getPath() {
        return this.getUrl().pathname || "";
    }
    path() {
        return this.getPath();
    }
    is(type) {
        assert.string(type, 'type');
        let contentType = this.getContentType();
        let matches = true;
        if (!contentType) {
            return false;
        }
        if (type.indexOf('/') === -1) {
            type = mime.lookup(type);
        }
        if (type.indexOf('*') !== -1) {
            type = type.split('/');
            contentType = contentType.split('/');
            matches = matches && (type[0] === '*' || type[0] === contentType[0]);
            matches = matches && (type[1] === '*' || type[1] === contentType[1]);
        }
        else {
            matches = (contentType === type);
        }
        return matches;
    }
    isSecure() {
        return this.header('X-Forwarded-Proto') === 'https';
    }
    isChunked() {
        return this.header('transfer-encoding') === 'chunked';
    }
    toString() {
        let headers = '';
        let str;
        Object.keys(this.headers).forEach((k) => {
            headers += util_1.format('%s: %s\n', k, this.headers[k]);
        });
        str = util_1.format('%s %s HTTP/%s\n%s', this.method, this.url, this.httpVersion, headers);
        return (str);
    }
    userAgent() {
        return this.headers['user-agent'];
    }
    getVersion() {
        return this.headers['accept-version'] || this.headers['x-api-version'] || '*';
    }
    version() {
        return this.getVersion();
    }
    matchedVersion() {
        if (this._meta.matchedVersion !== undefined) {
            return (this._meta.matchedVersion);
        }
        else {
            return this.getVersion();
        }
    }
    trailer(name, value) {
        return value;
    }
    isKeepAlive() {
        if (this.headers.connection) {
            return /keep-alive/i.test(this.headers.connection);
        }
        else {
            return this.httpVersion === '1.0' ? false : true;
        }
    }
    isUpload() {
        return (this.method === 'PATCH' || this.method === 'POST' || this.method === 'PUT');
    }
}
exports.default = Request;
