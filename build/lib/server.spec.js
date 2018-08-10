"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const should = chai.should();
const expect = chai.expect;
const server_1 = require("./server");
const sampleEventSource = require('../../tests/data/sample_event_source');
const logger_1 = require("./logger");
const errors = require("restify-errors");
const utils = require("./utils");
let responseError, response;
function createModel(serverOptions) {
    return new server_1.default(Object.assign({}, {
        logLevel: logger_1.default.DEBUG
    }, serverOptions));
}
function createEventSource(customEventSource) {
    if (customEventSource && customEventSource.headers) {
        customEventSource.headers = Object.assign({}, sampleEventSource.headers, customEventSource.headers);
    }
    return Object.assign({}, sampleEventSource, customEventSource || {});
}
function createlambdaCallback(next) {
    return (error, result) => {
        responseError = error;
        response = result;
        if (next) {
            next(error, result);
        }
    };
}
function triggerRequest(server, customEventSource, onResponse) {
    server.handleLambdaEvent(createEventSource(customEventSource), null, createlambdaCallback(onResponse));
}
describe('Server', () => {
    let server;
    beforeEach(() => {
        server = createModel();
    });
    function testSuccessModelResponse() {
        // tslint:disable-next-line:no-unused-expression
        expect(responseError).to.be.null;
        expect(response).to.be.an('object');
    }
    function testHeaderInModelResponse(name, value) {
        testSuccessModelResponse();
        const t = expect(response.headers).to.be.an('object');
        if (value) {
            t.with.property(name, value);
        }
        else {
            t.with.property(name);
        }
    }
    function testStatusCodeInModelResponse(code) {
        testSuccessModelResponse();
        response.should.have.property('statusCode');
    }
    function testBodyInModelResponse(body, contentType, contentLength) {
        testSuccessModelResponse();
        response.should.have.property('body', body);
        if (contentType !== undefined) {
            expect(response.headers).to.be.an('object').with.property('content-type', contentType);
        }
        if (contentLength !== undefined) {
            expect(response.headers).to.be.an('object').with.property('content-length', contentLength);
        }
    }
    function makeRequest(url, method = 'GET', headers = {}, body = '') {
        return __awaiter(this, void 0, void 0, function* () {
            return yield utils.promiseFromCallback((next) => {
                triggerRequest(server, {
                    body,
                    headers,
                    httpMethod: method,
                    path: url
                }, next);
            });
        });
    }
    describe('pre', () => {
        it('should register pre handler', (done) => {
            server.pre((req, res, next) => {
                req.someValue = 23;
                return next();
            });
            server.get('/r1', (req, res) => {
                should.equal(req.someValue, 23);
                done();
            });
            triggerRequest(server, {
                path: "/r1",
                httpMethod: "GET"
            });
        });
        it('should register multiple pre handler', (done) => {
            server.pre((req, res, next) => {
                req.someValue = 23;
                return next();
            }, (req, res, next) => {
                req.someOtherValue = 24;
                return next();
            });
            server.get('/r1', (req, res) => {
                should.equal(req.someValue, 23);
                should.equal(req.someOtherValue, 24);
                done();
            });
            triggerRequest(server, {
                path: "/r1",
                httpMethod: "GET"
            });
        });
        it('prerouting - pre handler throws error', (done) => {
            server.pre((req, res, next) => {
                next(new errors.BadRequestError('abc'));
            });
            server.get('/r1', (req, res) => {
                chai.assert.notOk("Should not have reached");
            });
            triggerRequest(server, {
                path: "/r1",
                httpMethod: "GET"
            }, () => {
                testStatusCodeInModelResponse(400);
                testBodyInModelResponse('BadRequestError: abc');
                done();
            });
        });
        it('prerouting - handlers should be fired even if no route was selected', (done) => {
            server.pre((req, res, next) => {
                next();
            });
            triggerRequest(server, {
                path: 'nosuchpath'
            }, () => {
                testStatusCodeInModelResponse(404);
                done();
            });
        });
        it('prerouting - next(false) should skip the remaining handlers', (done) => {
            server.pre((req, res, next) => {
                res.send('some');
                next(false);
            });
            server.get('/some/path', (req, res, next) => {
                chai.assert.notOk('Should not be reached');
            });
            triggerRequest(server, {
                path: '/some/path'
            }, () => {
                testStatusCodeInModelResponse(200);
                testBodyInModelResponse('some');
                done();
            });
        });
    });
    describe('use', () => {
        it('should register handler', (done) => {
            server.use((req, res, next) => {
                req.someValue = 23;
                return next();
            });
            server.get('/r1', (req, res) => {
                should.equal(req.someValue, 23);
                done();
            });
            triggerRequest(server, {
                path: "/r1",
                httpMethod: "GET"
            });
        });
        it('should register multiple handler', (done) => {
            server.use((req, res, next) => {
                req.someValue = 23;
                return next();
            }, (req, res, next) => {
                req.someOtherValue = 24;
                return next();
            });
            server.get('/r1', (req, res) => {
                should.equal(req.someValue, 23);
                should.equal(req.someOtherValue, 24);
                done();
            });
            triggerRequest(server, {
                path: "/r1",
                httpMethod: "GET"
            });
        });
        it('handler should run after pre handlers', (done) => {
            server.use((req, res, next) => {
                should.equal(req.someValue, 23);
                next();
            });
            server.pre((req, res, next) => {
                req.someValue = 23;
                next();
            });
            server.get('/r1', (req, res) => {
                done();
            });
            triggerRequest(server, {
                path: "/r1",
                httpMethod: "GET"
            });
        });
        it('handler should only run when route has matched', (done) => {
            server.use((req, res, next) => {
                chai.assert.notOk('should not have reached');
                next();
            });
            triggerRequest(server, {
                path: "nosuchpath",
                httpMethod: "GET"
            });
            setTimeout(done, 20);
        });
        it('should handle error thrown in use', (done) => {
            server.use((req, res, next) => {
                next(new errors.BadRequestError('abc'));
            });
            server.get('/r1', (req, res) => {
                chai.assert.notOk("Should not have reached");
            });
            triggerRequest(server, {
                path: "/r1",
                httpMethod: "GET"
            }, () => {
                testStatusCodeInModelResponse(400);
                testBodyInModelResponse('BadRequestError: abc');
                done();
            });
        });
    });
    describe('params support', () => {
        it('should match and provide params', () => __awaiter(this, void 0, void 0, function* () {
            server.get('/users/:id/:task', (req, res, next) => {
                res.send(req.params.id + ':' + req.params.task);
            });
            yield makeRequest('/users/23/delete');
            testBodyInModelResponse('23:delete');
        }));
    });
    describe('version support', () => {
        function checkInvalidVersionError() {
            testStatusCodeInModelResponse(400);
            response.should.have.property('body');
            response.body.should.include('InvalidVersionError');
        }
        it('should allow different version to coexist', () => __awaiter(this, void 0, void 0, function* () {
            server.get({ path: '/vr', version: '1.1.3' }, (req, res) => {
                res.send('1.1.3');
            });
            server.get({ path: '/vr', version: '2.0.1' }, (req, res) => {
                res.send('2.0.1');
            });
            yield makeRequest('/vr', 'GET', {
                'accept-version': '~1'
            });
            testBodyInModelResponse('1.1.3');
            yield makeRequest('/vr', 'GET', {
                'accept-version': '~2'
            });
            testBodyInModelResponse('2.0.1');
        }));
        it('should throw version error if no valid one exist', () => __awaiter(this, void 0, void 0, function* () {
            server.get({ path: '/vr', version: '1.1.3' }, (req, res) => {
                res.send('1.1.3');
            });
            yield makeRequest('/vr', 'GET', {
                'accept-version': '~2'
            });
            checkInvalidVersionError();
        }));
        it('should use latest once if no version specified', () => __awaiter(this, void 0, void 0, function* () {
            server.get({ path: '/vr', version: '1.1.3' }, (req, res) => {
                res.send('1.1.3');
            });
            server.get({ path: '/vr', version: '2.0.1' }, (req, res) => {
                res.send('2.0.1');
            });
            yield makeRequest('/vr');
            testBodyInModelResponse('2.0.1');
        }));
        it('should support versionedUse', () => __awaiter(this, void 0, void 0, function* () {
            server.versionedUse(['1.0.1', '2.0.3'], (req, res) => {
                res.send('1,2');
            });
            server.versionedUse('3.1.2', (req, res) => {
                res.send('3');
            });
            server.get({ path: '/v', version: ['1.0.1', '2.0.3', '3.1.2', '4.0.1'] }, (req, res) => {
                res.send('nv');
            });
            yield makeRequest('/v', 'GET', {
                'accept-version': '~3'
            });
            testBodyInModelResponse('3');
            yield makeRequest('/v', 'GET', {
                'accept-version': '~1'
            });
            testBodyInModelResponse('1,2');
            yield makeRequest('/v', 'GET', {
                'accept-version': '~4'
            });
            testBodyInModelResponse('nv');
            yield makeRequest('/v', 'GET');
            testBodyInModelResponse('nv');
        }));
        it('should respect server.versions option', () => __awaiter(this, void 0, void 0, function* () {
            server.get('/p', (req, res) => {
                res.send('a');
            });
            server.get({ path: '/p', version: '2.1.1' }, (req, res) => {
                res.send('b');
            });
            yield makeRequest('/p', 'GET', {
                'accept-version': '~1'
            });
            checkInvalidVersionError();
            server = createModel({
                versions: ['1.0.1']
            });
            server.get('/p', (req, res) => {
                res.send('a');
            });
            server.get({ path: '/p', version: '2.1.1' }, (req, res) => {
                res.send('b');
            });
            yield makeRequest('/p', 'GET', {
                'accept-version': '~1'
            });
            testBodyInModelResponse('a');
        }));
    });
    describe('routing', () => {
        it('should differentiate between different verbs', () => __awaiter(this, void 0, void 0, function* () {
            server.get('/p', (req, res) => {
                res.send('g');
            });
            server.post('/p', (req, res) => {
                res.send('p');
            });
            yield makeRequest('/p', 'GET');
            testBodyInModelResponse('g');
            yield makeRequest('/p', 'POST');
            testBodyInModelResponse('p');
        }));
        it('should throw invalid method error if wrong method', () => __awaiter(this, void 0, void 0, function* () {
            server.get('/p', (req, res) => { });
            yield makeRequest('/p', 'POST');
            testStatusCodeInModelResponse(405);
            response.should.have.property('body').which.includes('MethodNotAllowedError');
        }));
        it('should respect strictRouting option', () => __awaiter(this, void 0, void 0, function* () {
            server.get('/q', (req, res) => {
                res.send('1');
            });
            yield makeRequest('/q/');
            testStatusCodeInModelResponse(200);
            server = createModel({
                strictRouting: true
            });
            server.get('/p', (req, res) => {
                res.send('1');
            });
            yield makeRequest('/p/');
            testStatusCodeInModelResponse(404);
        }));
    });
    describe('custom formatters', () => {
        it('should support formatters option', () => __awaiter(this, void 0, void 0, function* () {
            server = createModel({
                formatters: {
                    'text/html': (req, res, body) => {
                        let data = body ? body.toString() : '';
                        data = '[' + data + ']';
                        res.setHeader('Content-Length', Buffer.byteLength(data));
                        return data;
                    }
                }
            });
            server.get('/p', (req, res) => {
                res.send('a');
            });
            yield makeRequest('/p');
            testBodyInModelResponse('[a]');
        }));
    });
    describe('body parser', () => {
        it('should parse urlencoded body', () => __awaiter(this, void 0, void 0, function* () {
            server.post('/p', (req, res) => {
                res.json(req.body);
            });
            yield makeRequest('/p', 'POST', {
                'content-type': 'application/x-www-form-urlencoded'
            }, 'a=12&b=c&d=1&d=2');
            testSuccessModelResponse();
            response.should.have.property('body');
            const b = JSON.parse(response.body);
            b.should.have.property('a', '12');
            b.should.have.property('b', 'c');
            b.should.have.property('d').which.is.an('array').which.is.deep.equal(['1', '2']);
        }));
        it('should parse json body', () => __awaiter(this, void 0, void 0, function* () {
            server.post('/p', (req, res) => {
                res.json(req.body);
            });
            yield makeRequest('/p', 'POST', {
                'content-type': 'application/json'
            }, JSON.stringify({ a: 1, b: 2 }));
            testSuccessModelResponse();
            response.should.have.property('body');
            const b = JSON.parse(response.body);
            b.should.have.property('a', 1);
            b.should.have.property('b', 2);
        }));
        it('should not parse when server.dontParseBody is set to true', () => __awaiter(this, void 0, void 0, function* () {
            server = createModel({
                dontParseBody: true
            });
            server.post('/p', (req, res) => {
                res.send(req.body);
            });
            yield makeRequest('/p', 'POST', {
                'content-type': 'application/x-www-form-urlencoded'
            }, 'a=12&b=c&d=1&d=2');
            testSuccessModelResponse();
            response.should.have.property('body', 'a=12&b=c&d=1&d=2');
        }));
    });
});
