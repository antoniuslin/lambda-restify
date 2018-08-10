export declare type httpMethod = "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
export declare type Partial<T> = {
    [P in keyof T]?: T[P];
};
export interface EventSource {
    "body": string;
    "resource": string;
    "requestContext": {
        "resourceId": string;
        "apiId": string;
        "resourcePath": string;
        "httpMethod": httpMethod;
        "requestId": string;
        "accountId": string;
        "identity": {
            "apiKey": any;
            "userArn": any;
            "cognitoAuthenticationType": any;
            "caller": any;
            "userAgent": any;
            "user": any;
            "cognitoIdentityPoolId": any;
            "cognitoIdentityId": any;
            "cognitoAuthenticationProvider": any;
            "sourceIp": any;
            "accountId": any;
        };
        "stage": string;
    };
    "queryStringParameters": {
        [key: string]: string;
    } | null;
    "headers": {
        [key: string]: string;
    };
    "pathParameters": {
        "proxy": string;
    };
    "httpMethod": httpMethod;
    "stageVariables": {
        [key: string]: string;
    };
    "path": string;
}
export declare type PartialEventSource = Partial<EventSource>;
