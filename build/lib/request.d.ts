/// <reference path="../../node_modules/@types/node/index.d.ts" />
/// <reference types="node" />
import { EventSource } from './event_source';
import * as url from 'url';
import Logger from './logger';
export default class Request {
    private source;
    log: Logger;
    headers: {
        [key: string]: string;
    };
    url: string;
    httpVersion: string;
    method: string;
    params: {
        [key: string]: string;
    };
    _meta: any;
    serverName: string;
    body: string | object;
    rawBody: string;
    private negotiator;
    private contentLengthCached;
    private contentTypeCached;
    private startingTime;
    private _id;
    private cachedUrlObject;
    private cachedUrl;
    constructor(source: EventSource, log: Logger);
    header(name: string, value?: string): string | undefined;
    accepts(types: string | string[]): any;
    acceptsEncoding(types: string | string[]): any;
    getContentLength(): number | true | undefined;
    contentLength(): number | true | undefined;
    getContentType(): string;
    contentType(): string;
    time(): number;
    date(): Date;
    getQuery(): string | import("querystring").ParsedUrlQuery | null | undefined;
    query(): string | import("querystring").ParsedUrlQuery | null | undefined;
    getUrl(): url.Url;
    href(): string | undefined;
    id(reqId?: string): string;
    getId(): string;
    getPath(): string;
    path(): string;
    is(type: any): boolean;
    isSecure(): boolean;
    isChunked(): boolean;
    toString(): any;
    userAgent(): string;
    getVersion(): string;
    version(): string;
    matchedVersion(): any;
    trailer(name: string, value?: string): string | undefined;
    isKeepAlive(): boolean;
    isUpload(): boolean;
}
