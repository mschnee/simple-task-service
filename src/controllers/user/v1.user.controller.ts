import * as bcrypt from 'bcrypt';
import {NextFunction, Response} from 'express';
import * as sanitize from 'express-mongo-sanitize';
import {body, validationResult} from 'express-validator/check';
import * as HttpStatus from 'http-status-codes';
import * as jwt from 'jsonwebtoken';

import {DEFAULT_SALT, USER_COLLECTION} from '../../constants';
import Controller from '../../models/Controller';
import {Parsers, PublicUserModel, RequestContext, UserModel} from '../../types';

export default class V1UserController extends Controller {
    constructor(parent: Controller) {
        super(parent);

        this.routes.post(
            '/create',
            sanitize(),
            this.service.parsers[Parsers.JSON],
            [
                body('email')
                    .isEmail()
                    .normalizeEmail(),
                body('password')
                    .isString()
                    .isLength({min: 12, max: 2048}),
            ],
            this.create.bind(this),
        );

        this.routes.post(
            '/login',
            (req: RequestContext, res: Response, next: NextFunction) => {
                next();
            },
            sanitize(),
            this.service.parsers[Parsers.JSON],
            [
                body('email')
                    .isEmail()
                    .normalizeEmail(),
                body('password')
                    .isString()
                    .isLength({min: 12, max: 2048}),
            ],
            this.service.loginMiddleware,
            this.login.bind(this),
        );

        this.routes.get('/whoami', this.service.authMiddleware, this.whoami.bind(this));
    }

    public async create(req: RequestContext, res: Response, next: NextFunction) {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({errors: validationErrors.array()});
        } else {
            const currentUser = await this.service.db.collection(USER_COLLECTION).findOne({
                email: req.body.email,
            });

            if (currentUser) {
                res.status(HttpStatus.CONFLICT).json({error: 'Email already in use'});
            } else {
                bcrypt.hash(
                    req.body.password,
                    process.env.BCRYPT_SALT || DEFAULT_SALT,
                    async (err: Error, hash: string) => {
                        const insertResult = await this.service.db
                            .collection<Partial<UserModel>>(USER_COLLECTION)
                            .insertOne({
                                email: req.body.email,
                                password: hash,
                            });

                        const newUser: UserModel = insertResult.ops[0];
                        const publicUser: PublicUserModel = {
                            id: (newUser._id && newUser._id.toHexString()) || '',
                            email: newUser.email,
                        };
                        res.status(HttpStatus.OK).json(publicUser);
                    },
                );
            }
        }
    }

    public async login(req: RequestContext, res: Response, next: NextFunction) {
        try {
            jwt.sign(
                req.user,
                process.env.JWT_SECRET || '',
                async (signError: Error, token: string) => {
                    if (signError) {
                        throw signError;
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
            res.status(HttpStatus.UNAUTHORIZED).json({error: 'Not Authorized'});
        }
    }

    public async whoami(req: RequestContext, res: Response, next: NextFunction) {
        res.status(HttpStatus.OK).json({
            email: req.user.email,
        });
    }
}
