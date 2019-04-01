import {Server} from 'http';
import {promisify} from 'util';

import * as bcrypt from 'bcrypt';
import * as express from 'express';
import getPort from 'get-port';
import * as helmet from 'helmet';
import {Db, MongoClient, ObjectId} from 'mongodb';
import * as passport from 'passport';
import {ExtractJwt, Strategy as JwtStrategy, VerifiedCallback} from 'passport-jwt';
import {Strategy as LocalStrategy} from 'passport-local';
import * as redis from 'redis';

import bodyParser = require('body-parser');
import {CACHED_USER_KEY, TASK_DB_NAME, USER_COLLECTION} from './constants';
import {BaseController} from './controllers/BaseController';
import Controller from './models/Controller';
import {HttpError, NotAcceptable, NotAuthorized} from './models/HttpErrors';
import {
    Middleware,
    Parsers,
    PublicUserModel,
    RequestContext,
    ServiceInterface,
    UserModel,
} from './types';

export interface ServiceOptions {
    host: string;
    port: number;
}

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';

function getElapsedTime(startTime: [number, number]) {
    const elapsedTime = process.hrtime(startTime);
    // tslint:disable-next-line:no-magic-numbers
    const elapsedTimeInMs = elapsedTime[0] * 1000 + elapsedTime[1] / 1e6;
    return elapsedTimeInMs;
}

export default class Service implements ServiceInterface {
    public app: express.Application;
    public authMiddleware: Middleware;
    public cache: redis.RedisClient;
    public db: Db;
    public hostname: string;
    public loginMiddleware: Middleware;
    public parsers: {[key: string]: Middleware} = {};
    public port: number;
    public server: Server;
    private appOptions: ServiceOptions;
    private baseController: Controller;
    private booted: boolean = false;

    constructor(options?: ServiceOptions) {
        this.appOptions = {
            port: (options && options.port) || DEFAULT_PORT,
            host: (options && options.host) || DEFAULT_HOST,
        };
    }

    /**
     * Sets up middleware and services
     */
    public async boot() {
        this.app = express();
        // setup logging
        this.app.use((req, res, next) => {
            const startTime = process.hrtime();
            res.on('finish', () => {
                const elapsedTime = getElapsedTime(startTime);
                console.log({
                    namespace: 'task-service.service.request.finished',
                    context: {
                        time: elapsedTime,
                        status: res.statusCode,
                        url: req.originalUrl,
                    },
                });
            });
            res.on('error', err => {
                const elapsedTime = getElapsedTime(startTime);
                console.error({
                    namespace: 'task-service.service.request.error',
                    context: {
                        error: err,
                        time: elapsedTime,
                        status: res.statusCode,
                        url: req.originalUrl,
                    },
                });
            });
            next();
        });
        this.app.use(helmet());

        /**
         * Set up some body parsers
         */
        this.parsers[Parsers.JSON] = bodyParser.json();

        /**
         * Setup MongoDB
         */
        await new Promise((resolve, reject) => {
            MongoClient.connect(
                process.env.TASKDB_URL as string,
                {useNewUrlParser: true},
                (err, client: MongoClient) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.db = client.db(TASK_DB_NAME);
                        resolve();
                    }
                },
            );
        });

        /**
         * Setup Redis
         */
        await new Promise((resolve, reject) => {
            this.cache = redis.createClient({
                url: process.env.REDIS_URL,
            });

            this.cache.on('error', err => {
                console.error(err);
            });

            this.cache.on('ready', resolve);
        });

        /**
         * Setup Passport for JWT and also local-login
         */
        passport.use(
            'jwt',
            new JwtStrategy(
                {
                    secretOrKey: process.env.JWT_SECRET,
                    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                },
                (payload: PublicUserModel, done: VerifiedCallback) =>
                    this.validateJwt(payload, done),
            ),
        );
        passport.use(
            'local',
            new LocalStrategy(
                {
                    usernameField: 'email',
                    passwordField: 'password',
                    session: false,
                },
                (
                    username: string,
                    password: string,
                    done: (error: Error, user?: PublicUserModel) => void,
                ) => this.validateLogin(username, password, done),
            ),
        );
        this.app.use(passport.initialize());
        this.loginMiddleware = passport.authenticate('local', {session: false});
        this.authMiddleware = passport.authenticate('jwt', {session: false});

        this.app.use((req: RequestContext, res: express.Response, next: express.NextFunction) =>
            this.installServerContext(req, res, next),
        );

        this.baseController = new BaseController(this);
        this.app.use(this.baseController.routes);
    }

    public async start() {
        if (!this.booted) {
            await this.boot();
        }
        this.port = await getPort({port: this.appOptions.port});
        this.hostname = this.appOptions.host;

        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, this.hostname, () => {
                console.log({
                    message: `Listening on ${this.port}`,
                    namespace: 'task-service.service.start',
                });
                resolve();
            });
        });
    }

    private installServerContext(
        req: RequestContext,
        res: express.Response,
        next: express.NextFunction,
    ) {
        req.context = {
            db: this.db,
            cache: this.cache,
        };

        // as an API, we really only care about json, unless specifically noted otherwise.
        req.accepts('application/json');
        res.set('Content-Type', 'application/json');

        next();
    }

    /**
     * JWT verification
     * @param req
     * @param payload
     * @param done
     */
    private async validateJwt(payload: PublicUserModel, done: VerifiedCallback) {
        if (!payload || !payload.id) {
            done(null, false);
        } else {
            const userId = payload.id;
            const getAsync = promisify(this.cache.get).bind(this.cache);

            const cachedRawUser = await getAsync(`${CACHED_USER_KEY}:${userId}`);
            if (cachedRawUser) {
                const user = JSON.parse(cachedRawUser);
                done(null, user);
            } else {
                const userResult = await this.db
                    .collection<UserModel>(USER_COLLECTION)
                    .findOne(new ObjectId(userId));

                if (userResult) {
                    const publicUser = {
                        id: userResult.id || userResult._id,
                        email: userResult.email,
                    };
                    done(null, publicUser);
                } else {
                    done(null, false);
                }
            }
        }
    }

    private async validateLogin(
        email: string,
        password: string,
        done: (error: Error | null, user?: PublicUserModel) => void,
    ) {
        if (!email) {
            done(new NotAcceptable('Missing email'));
        } else if (!password) {
            done(new NotAcceptable('Missing password'));
        } else {
            try {
                const user = await this.db.collection<UserModel>(USER_COLLECTION).findOne({
                    email,
                });

                if (user) {
                    try {
                        bcrypt.compare(
                            password,
                            user.password,
                            (bcryptErr: Error, res: boolean) => {
                                if (bcryptErr) {
                                    done(bcryptErr);
                                } else if (!res) {
                                    done(new NotAuthorized('Not Authorized'));
                                } else {
                                    const publicUser = {
                                        id: user.id || user._id || '',
                                        email: user.email,
                                    };
                                    done(null, publicUser);
                                }
                            },
                        );
                    } catch (e) {
                        done(e);
                    }
                }
            } catch (e) {
                if (e instanceof HttpError) {
                    done(e);
                } else {
                    const err = new NotAuthorized('Not Authorized');
                    done(err);
                }
            }
        }
    }
}
