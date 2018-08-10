export declare function createHttpError(msg: string, code: number): Error;
export declare function httpDate(now?: any): any;
export declare function createFormattersAndAcceptables(fmt?: any): {
    formatters: {};
    acceptable: any[];
};
export declare function shallowCopy(obj: any): any;
export declare function mergeQs(obj1: any, obj2: any): any;
/**
 * Headers that cannot be multi-values.
 * @see #779, don't use comma separated values for set-cookie
 * @see #986, don't use comma separated values for content-type
 * @see http://tools.ietf.org/html/rfc6265#section-3
 */
export declare const HEADER_ARRAY_BLACKLIST: {
    'set-cookie': boolean;
    'content-type': boolean;
};
