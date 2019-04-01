import {Server} from 'http';

import {Application, NextFunction, Request, Response} from 'express';
import {Db} from 'mongodb';
import {RedisClient} from 'redis';

export interface RequestContext extends Request {
    context: {
        cache: RedisClient;
        db: Db;

        // tslint:disable-next-line:no-any
        [key: string]: any;
    };
}

export interface UserModel {
    _id?: string;
    email: string;
    id?: string;
    password: string;
}

export interface PublicUserModel {
    email: string;
    id: string;
}

export declare type Middleware = (req: Request, res: Response, next: NextFunction) => void;

export interface ServiceInterface {
    app: Application;
    authMiddleware: Middleware;
    boot: Function;
    cache: RedisClient;
    db: Db;
    hostname: string;
    loginMiddleware: Middleware;
    parsers: {[key: string]: Middleware};
    port: number;
    server: Server;
    start: Function;
    stop: Function;
}

export enum Parsers {
    JSON = 'application/json',
}
