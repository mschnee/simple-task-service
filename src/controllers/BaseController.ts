import {ServiceInterface} from '../types';

import Controller from '../models/Controller';
import V1StatusController from './status/v1.status.controller';
import V1TaskController from './task/v1.task.controller';
import V1UserController from './user/v1.user.controller';

export class BaseController extends Controller {
    constructor(service: ServiceInterface) {
        super(service);

        const v1Status = new V1StatusController(this);
        const v1User = new V1UserController(this);
        const v1Task = new V1TaskController(this);

        this.routes.use('/v1/status', v1Status.routes);
        this.routes.use('/v1/user', v1User.routes);
        this.routes.use('/v1/task', v1Task.routes);
    }
}
