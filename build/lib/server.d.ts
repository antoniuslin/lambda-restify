/// <reference types="node" />
import { EventEmitter } from 'events';
import { ServerOptions } from './server_options';
import Request from './request';
import Response from './response';
import { EventSource } from './event_source';
import { LamdaCallback } from './lambda_callback';
export declare type HandlerFunction = (req: Request, res: Response, next: (err?: Error | null | false) => any) => any;
export default class Server extends EventEmitter {
    private options;
    private before;
    private chain;
    private versions;
    private router;
    private routes;
    private log;
    private name;
    private acceptable;
    private formatters;
    constructor(options?: ServerOptions);
    pre(...args: any[]): this;
    use(...args: any[]): this;
    del(...args: any[]): any;
    get(...args: any[]): any;
    head(...args: any[]): any;
    opts(...args: any[]): any;
    post(...args: any[]): any;
    put(...args: any[]): any;
    patch(...args: any[]): any;
    param(name: any, fn: any): this;
    versionedUse(versions: string | string[], fn: any): this;
    handleLambdaEvent(eventSource: EventSource, context: any, lambdaCallback: LamdaCallback): void;
    private setupRequest;
    private handleRequest;
    private runHandlerChain;
    private route;
    private addMethodRoute;
}
