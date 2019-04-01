import {promisify} from 'util';

import {NextFunction, Response} from 'express';
import * as HttpStatus from 'http-status-codes';
import {ServerInfo} from 'redis';

import Controller from '../../models/Controller';
import {RequestContext} from '../../types';

export default class V1StatusController extends Controller {
    constructor(parent: Controller) {
        super(parent);
        this.routes.get('/', this.getStats.bind(this));
    }

    public async getStats(req: RequestContext, res: Response, next: NextFunction) {
        const infoAsync = promisify<ServerInfo>(this.service.cache.info).bind(this.service.cache);
        const redisInfo: ServerInfo = await infoAsync();
        const mongoStatus = await this.service.db.admin().serverStatus();

        if (typeof redisInfo === 'string') {
            res.status(HttpStatus.OK).json({
                cache: (redisInfo as string).split(/\r?\n/),
                db: mongoStatus,
            });
        } else {
            res.status(HttpStatus.OK).json({
                cache: redisInfo.redis_version,
                db: mongoStatus,
            });
        }
    }
}
