import {ServiceInterface} from '../types';

import {Router} from 'express';
import Controller from '../models/Controller';
import V1StatusController from './status/v1.status.controller';
import V1TaskController from './task/v1.task.controller';
import V2TaskController from './task/v2.task.controller';
import V1UserController from './user/v1.user.controller';

export class BaseController extends Controller {
    constructor(service: ServiceInterface) {
        super(service);
    }

    public getRoutes(routes = Router()) {
        const v1Status = new V1StatusController(this);
        const v1User = new V1UserController(this);
        const v1Task = new V1TaskController(this);
        const v2Task = new V2TaskController(this);

        routes.use('/v1/status', v1Status.getRoutes());
        routes.use('/v1/user', v1User.getRoutes());
        routes.use('/v1/task', v1Task.getRoutes());
        routes.use('/v2/task', v2Task.getRoutes());

        return routes;
    }
}
