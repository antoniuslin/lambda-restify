"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert-plus");
const url = require("url");
const util_1 = require("util");
const mime = require("mime");
const restify_utils_1 = require("./restify_utils");
class Response {
    // tslint:disable-next-line:max-line-length
    constructor(lambdaCallback, req, log, formatters, acceptable) {
        this.lambdaCallback = lambdaCallback;
        this.req = req;
        this.log = log;
        this.formatters = formatters;
        this.acceptable = acceptable;
        this.sendDate = true;
        // tslint:disable-next-line:variable-name
        this._meta = {};
        // tslint:disable-next-line:variable-name
        this._finished = false;
        // tslint:disable-next-line:variable-name
        this._headersSent = false;
        // tslint:disable-next-line:variable-name
        this._headers = {};
        this.lambdaCallbackCalled = false;
        // tslint:disable-next-line:variable-name
        this._body = '';
    }
    get finished() {
        return this._finished;
    }
    get headersSent() {
        return this._headersSent;
    }
    cache(type, options) {
        if (typeof (type) !== 'string') {
            options = type;
            type = 'public';
        }
        if (options && options.maxAge !== undefined) {
            assert.number(options.maxAge, 'options.maxAge');
            type += ', max-age=' + options.maxAge;
        }
        return this.header('Cache-Control', type);
    }
    noCache() {
        // HTTP 1.1
        this.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        // HTTP 1.0
        this.header('Pragma', 'no-cache');
        // Proxies
        this.header('Expires', '0');
        return this;
    }
    header(name, value) {
        assert.string(name, 'name');
        name = name.toLowerCase();
        if (value === undefined) {
            return this._headers[name];
        }
        if (value instanceof Date) {
            value = restify_utils_1.httpDate(value);
        }
        else if (arguments.length > 2) {
            // Support res.header('foo', 'bar %s', 'baz');
            value = util_1.format(value, Array.prototype.slice.call(arguments).slice(2));
        }
        const current = this._headers[name];
        // Check the header blacklist before changing a header to an array
        if (current && !(name in restify_utils_1.HEADER_ARRAY_BLACKLIST)) {
            if (Array.isArray(current)) {
                current.push(value);
                value = current;
            }
            else {
                value = [current, value];
            }
        }
        this._headers[name] = value;
        return value;
    }
    setHeader(name, value) {
        return this.header(name, value);
    }
    getHeaders() {
        const h = {};
        Object.keys(this._headers).map((name) => {
            let value = this._headers[name];
            if (Array.isArray(value)) {
                value = value.join(',');
            }
            h[name] = value;
        });
        return h;
    }
    headers() {
        return this.getHeaders();
    }
    send(code, body, headers) {
        const args = Array.prototype.slice.call(arguments);
        args.push(true); // Append format = true to __send invocation
        return this.__send.apply(this, args);
    }
    sendRaw(code, body, headers) {
        const args = Array.prototype.slice.call(arguments);
        args.push(false); // Append format = false to __send invocation
        return this.__send.apply(this, args);
    }
    removeHeader(name) {
        delete this._headers[name.toLowerCase()];
    }
    writeHead(code, message, headers) {
        if (code) {
            this.statusCode = code;
        }
        if (typeof message === 'string') {
            this.statusMessage = message;
        }
        if (typeof message === 'object') {
            headers = message;
        }
        if (this.statusCode === 204 || this.statusCode === 304) {
            this.removeHeader('Content-Length');
            this.removeHeader('Content-MD5');
            this.removeHeader('Content-Type');
            this.removeHeader('Content-Encoding');
        }
        if (typeof headers === 'object') {
            Object.keys(headers).forEach((k) => {
                // complete override, no multiple headers this way
                this.removeHeader(k);
                this.header(k, headers[k]);
            });
        }
    }
    write(chunk, encoding, callback) {
        this._body = this._body + (typeof chunk === 'string' ? chunk.toString() : chunk.toString(encoding || 'base64'));
        if (typeof encoding === 'function') {
            callback = encoding;
        }
        if (typeof callback === 'function') {
            process.nextTick(callback);
        }
        return true;
    }
    end(data, encoding, callback) {
        if (typeof data === 'string' || Buffer.isBuffer(data)) {
            if (typeof encoding === 'function') {
                callback = encoding;
                encoding = undefined;
            }
            this.write(data, encoding);
        }
        this.calllambdaCallback();
        this._finished = true;
        this._headersSent = true;
        if (typeof data === 'function') {
            callback = data;
        }
        if (typeof callback === 'function') {
            process.nextTick(callback);
        }
    }
    get(name) {
        return this.header(name);
    }
    json(code, object, headers) {
        if (!/application\/json/.test(this.header('content-type'))) {
            this.header('Content-Type', 'application/json');
        }
        return this.send(code, object, headers);
    }
    link(l, rel) {
        assert.string(l, 'link');
        assert.string(rel, 'rel');
        return this.header('Link', util_1.format('<%s>; rel="%s"', l, rel));
    }
    charSet(type) {
        assert.string(type, 'charset');
        this._charSet = type;
        return this;
    }
    redirect(arg1, arg2, arg3) {
        const self = this;
        let statusCode = 302;
        let finalUri;
        let redirectLocation;
        let next;
        // next is not mendatary in lambda restify version
        // 1) this is signature 1, where an explicit status code is passed in.
        //    MUST guard against null here, passing null is likely indicative
        //    of an attempt to call res.redirect(null, next);
        //    as a way to do a reload of the current page.
        if (arg1 && !isNaN(arg1)) {
            statusCode = arg1;
            finalUri = arg2;
            next = arg3;
        }
        else if (typeof (arg1) === 'string') {
            // 2) this is signaure number 2
            // otherwise, it's a string, and use it directly
            finalUri = arg1;
            next = arg2;
        }
        else if (typeof (arg1) === 'object') {
            // 3) signature number 3, using an options object.
            // set next, then go to work.
            next = arg2;
            const req = self.req;
            const opt = arg1 || {};
            const currentFullPath = req.href();
            const secure = (opt.hasOwnProperty('secure')) ?
                opt.secure :
                req.isSecure();
            // if hostname is passed in, use that as the base,
            // otherwise fall back on current url.
            const parsedUri = url.parse(opt.hostname || currentFullPath, true);
            // create the object we'll use to format for the final uri.
            // this object will eventually get passed to url.format().
            // can't use parsedUri to seed it, as it confuses the url module
            // with some existing parsed state. instead, we'll pick the things
            // we want and use that as a starting point.
            finalUri = {
                port: parsedUri.port,
                hostname: parsedUri.hostname,
                query: parsedUri.query,
                pathname: parsedUri.pathname
            };
            // start building url based on options.
            // first, set protocol.
            finalUri.protocol = (secure === true) ? 'https' : 'http';
            // then set host
            if (opt.hostname) {
                finalUri.hostname = opt.hostname;
            }
            // then set current path after the host
            if (opt.pathname) {
                finalUri.pathname = opt.pathname;
            }
            // then set port
            if (opt.port) {
                finalUri.port = opt.port;
            }
            // then add query params
            if (opt.query) {
                if (opt.overrideQuery === true) {
                    finalUri.query = opt.query;
                }
                else {
                    finalUri.query = restify_utils_1.mergeQs(opt.query, finalUri.query);
                }
            }
            // change status code to 301 permanent if specified
            if (opt.permanent) {
                statusCode = 301;
            }
        }
        // if we are missing a finalized uri
        // by this point, pass an error to next.
        if (!finalUri) {
            return next(restify_utils_1.createHttpError('could not construct url', 500));
        }
        redirectLocation = url.format(finalUri);
        self.send(statusCode, null, {
            Location: redirectLocation
        });
        if (typeof next === 'function') {
            next(false);
        }
    }
    status(code) {
        assert.number(code, 'code');
        this.statusCode = code;
        return code;
    }
    set(name, val) {
        if (arguments.length === 2) {
            assert.string(name, 'res.set(name, val) requires name to be a string');
            this.header(name, val);
        }
        else {
            assert.object(name, 'res.set(headers) requires headers to be an object');
            Object.keys(name).forEach((k) => {
                this.set(k, name[k]);
            });
        }
        return this;
    }
    getHeaderNames() {
        return Object.keys(this._headers);
    }
    hasHeader(name) {
        return this._headers.hasOwnProperty(name);
    }
    writeContinue() {
        // noop
    }
    __send() {
        const isHead = this.req.method === 'HEAD';
        let code, body, headers, format;
        // derive arguments from types, one by one
        let index = 0;
        // Check to see if the first argument is a status code
        if (typeof arguments[index] === 'number') {
            code = arguments[index++];
        }
        // Check to see if the next argument is a body
        if (typeof arguments[index] === 'object' ||
            typeof arguments[index] === 'string') {
            body = arguments[index++];
        }
        // Check to see if the next argument is a collection of headers
        if (typeof arguments[index] === 'object') {
            headers = arguments[index++];
        }
        // Check to see if the next argument is the format boolean
        if (typeof arguments[index] === 'boolean') {
            format = arguments[index++];
        }
        // Now lets try to derive values for optional arguments that we were not
        // provided, otherwise we choose sane defaults.
        // If the body is an error object and we were not given a status code, try
        // to derive it from the error object, otherwise default to 500
        if (!code && body instanceof Error) {
            code = body.statusCode || 500;
        }
        // Set sane defaults for optional arguments if they were not provided and
        // we failed to derive their values
        code = code || this.statusCode || 200;
        headers = headers || {};
        // Populate our response object with the derived arguments
        this.statusCode = code;
        Object.keys(headers).forEach((k) => {
            this.header(k, headers[k]);
        });
        if (this.sendDate && !this.hasHeader('date')) {
            this.header('date', restify_utils_1.httpDate());
        }
        // Flush takes our constructed response object and sends it to the client
        const flush = (formattedBody) => {
            this._data = formattedBody;
            // Flush headers
            this.writeHead(this.statusCode);
            // Send body if it was provided
            if (this._data) {
                this.write(this._data);
            }
            this.end();
            // Return the response object back out to the caller of __send
            return this;
        };
        // 204 = No Content and 304 = Not Modified, we don't want to send the
        // body in these cases. HEAD never provides a body.
        if (isHead || code === 204 || code === 304) {
            return flush();
        }
        // if no formatting, assert that the value to be written is a string
        // or a buffer, then send it.
        if (format === false) {
            assert.ok(typeof body === 'string' || Buffer.isBuffer(body), 'res.sendRaw() accepts only strings or buffers');
            return flush(body);
        }
        // if no body, then no need to format. if this was an error caught by a
        // domain, don't send the domain error either.
        if (body === undefined || (body instanceof Error && body.domain)) {
            return flush();
        }
        // At this point we know we have a body that needs to be formatted, so lets
        // derive the formatter based on the response object's properties
        // _formatterError is used to handle any case where we were unable to
        // properly format the provided body
        const formatterError = (err) => {
            // If the user provided a non-success error code, we don't want to mess
            // with it since their error is probably more important than our
            // inability to format their message.
            if (this.statusCode >= 200 && this.statusCode < 300) {
                this.statusCode = err.statusCode;
            }
            this.log.error({
                req: this.req,
                err
            }, 'error retrieving formatter');
            return flush();
        };
        let formatter;
        let type = this.header('Content-Type');
        // Check to see if we can find a valid formatter
        if (!type && !this.req.accepts(this.acceptable)) {
            return formatterError(restify_utils_1.createHttpError('could not find suitable formatter', 406));
        }
        // Derive type if not provided by the user
        if (!type) {
            type = this.req.accepts(this.acceptable);
        }
        type = type.split(';')[0];
        if (!this.formatters[type] && type.indexOf('/') === -1) {
            type = mime.lookup(type);
        }
        // If we were unable to derive a valid type, default to treating it as
        // arbitrary binary data per RFC 2046 Section 4.5.1
        if (!this.formatters[type] && this.acceptable.indexOf(type) === -1) {
            type = 'application/octet-stream';
        }
        formatter = this.formatters[type] || this.formatters['*/*'];
        // If after the above attempts we were still unable to derive a formatter,
        // provide a meaningful error message
        if (!formatter) {
            return formatterError(restify_utils_1.createHttpError('could not find formatter for application/octet-stream', 500));
        }
        if (this._charSet) {
            type = type + '; charset=' + this._charSet;
        }
        // Update header to the derived content type for our formatter
        this.setHeader('Content-Type', type);
        // Finally, invoke the formatter and flush the request with it's results
        return flush(formatter(this.req, this, body));
    }
    calllambdaCallback() {
        if (!this.lambdaCallbackCalled) {
            this.lambdaCallbackCalled = true;
            this.lambdaCallback(null, {
                statusCode: this.statusCode,
                body: this._body || this.statusMessage || '',
                headers: this.getHeaders()
            });
        }
    }
}
exports.default = Response;
