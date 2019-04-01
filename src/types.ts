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
    email: string;
    id: string;
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
    cache: RedisClient;
    db: Db;
    loginMiddleware: Middleware;
    server: Server;
}
