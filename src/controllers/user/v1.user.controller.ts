import {NextFunction, Response} from 'express';
import * as HttpStatus from 'http-status-codes';
import * as jwt from 'jsonwebtoken';

import Controller from '../../models/Controller';
import {NotAuthorized} from '../../models/HttpErrors';
import {RequestContext} from '../../types';

export default class V1UserController extends Controller {
    constructor(parent: Controller) {
        super(parent);
        this.routes.post('/login', this.service.loginMiddleware, this.login);
        this.routes.get('/whoami', this.service.authMiddleware, this.whoami);
    }

    public async login(req: RequestContext, res: Response, next: NextFunction) {
        try {
            jwt.sign(
                req.user,
                process.env.JWT_SECRET || '',
                async (signError: Error, token: string) => {
                    if (signError) {
                        next(signError);
                    } else {
                        res.status(HttpStatus.OK).send({
                            token,
                        });
                    }
                },
            );
        } catch (e) {
            console.error({
                namespace: 'task-service.controllers.user.v1.login',
                message: e.message,
                context: {
                    error: e,
                },
            });
            const err = new NotAuthorized('Not Authorized');
            next(err);
        }
    }

    public async whoami(req: RequestContext, res: Response, next: NextFunction) {
        res.status(HttpStatus.OK).json({
            email: req.user.email,
        });
    }
}
