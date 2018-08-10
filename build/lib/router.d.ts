/// <reference types="node" />
import { EventEmitter } from 'events';
import { ServerOptions } from './server_options';
import Request from './request';
import Response from './response';
import Logger from './logger';
export default class Router extends EventEmitter {
    private options;
    private log;
    versions: string[];
    mounts: any;
    private strict;
    private routes;
    private reverse;
    private contentType;
    private cache;
    private name;
    constructor(options: ServerOptions, log: Logger);
    mount(options: any): any;
    find(req: Request, res: Response, callback: any): void;
}
