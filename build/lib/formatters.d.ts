import Request from './request';
import Response from './response';
declare const _default: {
    'application/javascript; q=0.1': (req: Request, res: Response, body: any) => any;
    'application/json; q=0.4': (req: Request, res: Response, body: any) => string;
    'text/plain; q=0.3': (req: Request, res: Response, body: any) => any;
    'text/html; q=0.31': (req: Request, res: Response, body: any) => any;
    'application/octet-stream; q=0.2': (req: Request, res: Response, body: any) => any;
};
export default _default;
