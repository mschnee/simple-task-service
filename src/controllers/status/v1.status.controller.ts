import {NextFunction, Response} from 'express';
import * as HttpStatus from 'http-status-codes';

import Controller from '../../models/Controller';
import {RequestContext} from '../../types';

export default class V1StatusController extends Controller {
    constructor(parent: Controller) {
        super(parent);
        this.routes.get('/', this.getStats);
    }

    public async getStats(req: RequestContext, res: Response, next: NextFunction) {
        const redisInfo: string = await new Promise(resolve =>
            this.service.cache.get('INFO', (err, info: string) => resolve(info)),
        );
        res.status(HttpStatus.OK).json({
            cache: redisInfo,
        });
    }
}
