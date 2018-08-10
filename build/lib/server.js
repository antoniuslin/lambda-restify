"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const restify_utils_1 = require("./restify_utils");
const assert = require("assert-plus");
const uuid = require("uuid");
const request_1 = require("./request");
const response_1 = require("./response");
const router_1 = require("./router");
const logger_1 = require("./logger");
const semver = require("semver");
const once_1 = require("./once");
const utils = require("./utils");
const errors = require("restify-errors");
const body_parser_1 = require("./body_parser");
class Server extends events_1.EventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
        this.before = [];
        this.chain = [];
        this.routes = {};
        this.versions = options.versions ? (Array.isArray(options.versions) ? options.versions : [options.versions]) : [];
        this.log = new logger_1.default(options.logLevel || logger_1.default.INFO);
        this.name = options.name || "lambdaRestify";
        this.router = new router_1.default(options, this.log);
        const fmt = restify_utils_1.createFormattersAndAcceptables(options.formatters);
        this.formatters = fmt.formatters;
        this.acceptable = fmt.acceptable;
        if (!options.dontParseBody) {
            this.pre(body_parser_1.default);
        }
    }
    pre(...args) {
        argumentsToChain(arguments).forEach((h) => this.before.push(h));
        return this;
    }
    use(...args) {
        argumentsToChain(arguments).forEach((h) => this.chain.push(h));
        return this;
    }
    del(...args) {
        return this.addMethodRoute('delete', ...args);
    }
    get(...args) {
        return this.addMethodRoute('get', ...args);
    }
    head(...args) {
        return this.addMethodRoute('head', ...args);
    }
    opts(...args) {
        return this.addMethodRoute('options', ...args);
    }
    post(...args) {
        return this.addMethodRoute('post', ...args);
    }
    put(...args) {
        return this.addMethodRoute('put', ...args);
    }
    patch(...args) {
        return this.addMethodRoute('patch', ...args);
    }
    param(name, fn) {
        this.use((req, res, next) => {
            if (req.params && req.params[name]) {
                fn.call(this, req, res, next, req.params[name], name);
            }
            else {
                next();
            }
        });
        return this;
    }
    versionedUse(versions, fn) {
        if (!Array.isArray(versions)) {
            versions = [versions];
        }
        assert.arrayOfString(versions, 'versions');
        versions.forEach((v) => {
            if (!semver.valid(v)) {
                throw new TypeError(v + ' is not a valid semver');
            }
        });
        this.use((req, res, next) => {
            const reqVersion = req.version();
            if (reqVersion === '*') {
                return next();
            }
            const ver = semver.maxSatisfying(versions, reqVersion);
            if (ver) {
                fn.call(this, req, res, next, ver);
            }
            else {
                next();
            }
        });
        return this;
    }
    handleLambdaEvent(eventSource, context, lambdaCallback) {
        this.log.trace('handleLambdaEvent', eventSource);
        const req = new request_1.default(eventSource, this.log);
        const res = new response_1.default(lambdaCallback, req, this.log, this.formatters, this.acceptable);
        this.log.trace('req,res', req.toString(), res.toString());
        this.setupRequest(req, res);
        this.handleRequest(req, res);
    }
    setupRequest(req, res) {
        req.log = res.log = this.log;
        req.serverName = this.name;
        // res.acceptable = self.acceptable;
        // res.formatters = self.formatters;
        // res.req = req;
        res.serverName = this.name;
        // set header only if name isn't empty string
        if (this.name !== '') {
            res.header('Server', this.name);
        }
        res.version = this.router.versions[this.router.versions.length - 1];
    }
    handleRequest(req, res) {
        const self = this;
        function routeAndRun() {
            self.log.trace('routeAndRun', req.path());
            self.route(req, res, (route, context) => {
                // emit 'routed' event after the req has been routed
                self.emit('routed', req, res, route);
                req._meta.context = req.params = context;
                req._meta.route = route.spec;
                const r = route ? route.name : null;
                const chain = self.routes[r];
                self.runHandlerChain(req, res, route, chain, function done(e) {
                    self.log.trace('ranReqResCycle', e);
                });
            });
        }
        // run pre() handlers first before routing and running
        if (self.before.length > 0) {
            self.runHandlerChain(req, res, null, self.before, (err) => {
                // check for return false here - like with the regular handlers,
                // if false is returned we already sent a response and should stop
                // processing.
                if (err === false) {
                    return;
                }
                if (!err) {
                    routeAndRun();
                }
            });
        }
        else {
            routeAndRun();
        }
    }
    runHandlerChain(req, res, route, chain, cb) {
        let i = -1;
        if (!req._meta.anonFuncCount) {
            // Counter used to keep track of anonymous functions. Used when a
            // handler function is anonymous. This ensures we're using a
            // monotonically increasing int for anonymous handlers through out the
            // the lifetime of this request
            req._meta.anonFuncCount = 0;
        }
        const log = this.log;
        const self = this;
        let handlerName;
        let emittedError = false;
        if (cb) {
            cb = once_1.default(cb);
        }
        function next(arg) {
            let done = false;
            if (arg) {
                if (arg instanceof Error) {
                    // if it's a formatter error, handle it differently.
                    if (arg.code === 'Formatter') {
                        // in the case of formatter error, emit a formatterError
                        // event, which is like an uncaughtException scenario in
                        // that a response must be flushed by the handler.
                        res.status(500);
                        // if consumer listens to this event, they must flush a
                        // response or the request will hang. don't fire the event
                        // unless someone is listening to it.
                        if (self.listeners('FormatterError').length > 0) {
                            self.emit('FormatterError', req, res, route, arg);
                        }
                        else {
                            // otherwise, log it and send empty response.
                            log.error(arg, 'error formatting response, ' +
                                'sending empty payload!');
                            res.send('');
                        }
                        // return early.
                        return;
                    }
                    const errName = arg.name.replace(/Error$/, '');
                    log.error({
                        err: arg,
                        errName
                    }, 'next(err=%s)', (arg.name || 'Error'));
                    // always attempt to use the most specific error listener
                    // possible. fall back on generic 'error' listener if we can't
                    // find one for the error we got.
                    let hasErrListeners = false;
                    const errEvtNames = [];
                    // if we have listeners for the specific error
                    if (self.listeners(errName).length > 0) {
                        hasErrListeners = true;
                        errEvtNames.push(errName);
                    }
                    // or if we have a generic error listener
                    if (self.listeners('restifyError').length > 0) {
                        hasErrListeners = true;
                        errEvtNames.push('restifyError');
                    }
                    if (hasErrListeners) {
                        Promise.all(errEvtNames.map((evtName) => {
                            // tslint:disable-next-line:no-shadowed-variable
                            return utils.promiseFromCallback((cb) => {
                                self.emit(evtName, req, res, arg, cb);
                            });
                        })).then(() => {
                            res.send(arg);
                            cb(arg);
                        }).catch((err) => {
                            res.send(err);
                            cb(err);
                        });
                        emittedError = true;
                    }
                    else {
                        res.send(arg);
                    }
                    done = true;
                }
            }
            if (arg === false) {
                done = true;
            }
            // Run the next handler up
            if (!done && chain[++i]) {
                if (chain[i]._skip) {
                    return next();
                }
                if (log.trace()) {
                    log.trace('running %s', chain[i].name || '?');
                }
                req._meta.currentRoute = (route !== null ? route.name : 'pre');
                handlerName = (chain[i].name ||
                    ('handler-' + req._meta.anonFuncCount++));
                req._meta.currentHandler = handlerName;
                // req.startHandlerTimer(handlerName);
                return chain[i].call(self, req, res, once_1.default(next));
            }
            // if (route === null) {
            //     self.emit('preDone', req, res);
            // } else {
            //     req.removeListener('close', _requestClose);
            //     req.removeListener('aborted', _requestAborted);
            //     self.emit('done', req, res, route);
            // }
            // Don't return cb here if we emit an error since we will cb after the
            // handler fires.
            if (!emittedError) {
                return (cb ? cb(arg) : true);
            }
            else {
                return (true);
            }
        }
        next();
    }
    route(req, res, cb) {
        this.router.find(req, res, (err, route, ctx) => {
            this.log.trace('router.find.res', err, route, ctx);
            const r = route ? route.name : null;
            if (err) {
                if (!optionsError(err, req, res)) {
                    emitRouteError(this, req, res, err);
                }
            }
            else if (!r || !this.routes[r]) {
                err = new errors.ResourceNotFoundError(req.path());
                emitRouteError(this, res, res, err);
            }
            else {
                cb(route, ctx);
            }
        });
    }
    addMethodRoute(method, ...args) {
        if (args.length < 2) {
            throw new TypeError('handler (function) required');
        }
        let opts = args[0];
        this.log.trace('addMethodRoute', method, opts);
        if (opts instanceof RegExp || typeof opts === 'string') {
            opts = {
                path: opts
            };
        }
        else if (typeof opts === 'object') {
            opts = restify_utils_1.shallowCopy(opts);
        }
        else {
            throw new TypeError('path (string) required');
        }
        const chain = [];
        let route;
        const self = this;
        function addHandler(h) {
            assert.func(h, 'handler');
            chain.push(h);
        }
        opts.method = method.toUpperCase();
        opts.versions = opts.versions || opts.version || self.versions;
        if (!Array.isArray(opts.versions)) {
            opts.versions = [opts.versions];
        }
        if (!opts.name) {
            opts.name = method + '-' + (opts.path || opts.url);
            if (opts.versions.length > 0) {
                opts.name += '-' + opts.versions.join('--');
            }
            opts.name = opts.name.replace(/\W/g, '').toLowerCase();
            if (this.router.mounts[opts.name]) { // GH-401
                opts.name += uuid.v4().substr(0, 7);
            }
        }
        route = this.router.mount(opts);
        if (!route) {
            return false;
        }
        this.chain.forEach(addHandler);
        argumentsToChain(arguments, 2).forEach(addHandler);
        this.routes[route] = chain;
        this.log.trace('added method route', opts);
        return route;
    }
}
exports.default = Server;
function argumentsToChain(args, start = 0) {
    assert.ok(args);
    args = Array.prototype.slice.call(args, start);
    if (args.length < 0) {
        throw new TypeError('handler (function) required');
    }
    const chain = [];
    function process(handlers) {
        for (const handler of handlers) {
            if (Array.isArray(handler)) {
                process(handler);
            }
            else {
                assert.func(handler, 'handler');
                chain.push(handler);
            }
        }
        return chain;
    }
    return process(args);
}
/**
 * returns true if an error generated is for an options request.
 * @private
 * @function optionsError
 * @param    {Object}     err an error object
 * @param    {Object}     req the request object
 * @param    {Object}     res the response object
 * @returns  {Boolean}
 */
function optionsError(err, req, res) {
    if (err.statusCode === 404 && req.method === 'OPTIONS' && req.url === '*') {
        res.send(200);
        return true;
    }
    return false;
}
/**
 * when an error occurrs, this is used to emit an error to consumers
 * via EventEmitter.
 * @private
 * @function emitRouteError
 * @param    {Object} server the server object
 * @param    {Object} req    the request object
 * @param    {Object} res    the response object
 * @param    {Object} err    an error object
 * @returns  {undefined}
 */
function emitRouteError(server, req, res, err) {
    let name;
    if (err.name === 'ResourceNotFoundError') {
        name = 'NotFound';
    }
    else if (err.name === 'InvalidVersionError') {
        name = 'VersionNotAllowed';
    }
    else {
        name = err.name.replace(/Error$/, '');
    }
    req.log.trace({ name, err }, 'entering emitRouteError');
    if (server.listeners(name).length > 0) {
        server.emit(name, req, res, err, once_1.default(() => {
            res.send(err);
        }));
    }
    else {
        res.send(err);
    }
}
