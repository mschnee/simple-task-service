import {Server} from 'http';

import {Application, NextFunction, Request, Response} from 'express';
import {Db, ObjectId} from 'mongodb';
import {RedisClient} from 'redis';

export interface RequestContext extends Request {
    context: {
        cache: RedisClient;
        db: Db;

        // tslint:disable-next-line:no-any
        [key: string]: any;
    };
}

export interface UserModel extends PublicUserModel {
    _id?: ObjectId;
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

export enum TaskStatus {
    NEW = 'new',
    COMPLETED = 'completed',
}

export enum TaskStatusV2 {
    NEW = 'new',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed',
}

export interface PublicTaskModel {
    description: string;
    id: string;
    name: string;
    status: TaskStatus;
}

export interface TaskModel extends PublicTaskModel {
    _id?: ObjectId;
    userId: ObjectId;
}

export interface PublicTaskModelV2 {
    description: string;
    id: string;
    name: string;
    status: TaskStatus;
}

export interface TaskModelV2 extends PublicTaskModel {
    _id?: ObjectId;
    userId: ObjectId;
}
