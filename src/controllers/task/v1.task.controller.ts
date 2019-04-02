import {NextFunction, Response} from 'express';
import * as sanitize from 'express-mongo-sanitize';
import {body, check, oneOf, validationResult} from 'express-validator/check';
import * as HttpStatus from 'http-status-codes';
import {ObjectId} from 'mongodb';

import {TASK_COLLECTION} from '../../constants';
import Controller from '../../models/Controller';
import {Parsers, PublicTaskModel, RequestContext, TaskModel, TaskStatus} from '../../types';

function toPublicTask(task: TaskModel): PublicTaskModel {
    return {
        id: (task._id && task._id.toHexString()) || '',
        description: task.description || '',
        name: task.name || '',
        status: task.status,
        dueDate: task.dueDate,
    };
}

export default class V1TaskController extends Controller {
    constructor(parent: Controller) {
        super(parent);

        this.routes.get(
            '/:taskId',
            this.service.authMiddleware,
            [check('taskId').isMongoId()],
            this.getAuthorizedTask.bind(this),
            this.getTask.bind(this),
        );

        this.routes.get('/', this.service.authMiddleware, this.getAllTasks.bind(this));
        this.routes.post(
            '/',
            sanitize(),
            this.service.authMiddleware,
            this.service.parsers[Parsers.JSON],
            [
                body('name')
                    .isString()
                    .not()
                    .isEmpty()
                    .trim()
                    .escape(),
                body('description')
                    .isString()
                    .not()
                    .isEmpty()
                    .trim()
                    .escape(),
                body('dueDate')
                    .isISO8601()
                    .not()
                    .isEmpty(),
            ],
            this.postTask.bind(this),
        );

        this.routes.put(
            '/:taskId',
            sanitize(),
            this.service.authMiddleware,
            this.service.parsers[Parsers.JSON],
            [
                check('taskId').isMongoId(),
                oneOf([
                    body('name').isEmpty(),
                    body('name')
                        .isString()
                        .trim()
                        .escape(),
                ]),
                oneOf([
                    body('description').isEmpty(),
                    body('description')
                        .isString()
                        .trim()
                        .escape(),
                ]),
                oneOf([body('dueDate').isEmpty(), body('dueDate').isISO8601()]),
                oneOf([
                    body('status').isEmpty(),
                    body('status').isIn([TaskStatus.NEW, TaskStatus.COMPLETED]),
                ]),
            ],
            this.getAuthorizedTask.bind(this),
            this.updateTask.bind(this),
        );
    }

    public async getAllTasks(req: RequestContext, res: Response, next: NextFunction) {
        const taskStream = this.service.db
            .collection(TASK_COLLECTION)
            .find({userId: new ObjectId(req.user.id)})
            .stream();
        res.writeHead(HttpStatus.OK, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked',
        });
        res.write('[');

        // tslint:disable-next-line:no-any
        let previous: any = null;

        taskStream.on('end', () => {
            if (previous) {
                res.write(JSON.stringify(toPublicTask(previous)));
            }
            res.write(']');
            res.end();
        });

        taskStream.on('data', item => {
            if (previous) {
                res.write(JSON.stringify(toPublicTask(previous)));
                res.write(',');
            }
            previous = item;
        });
    }

    public getTask(req: RequestContext, res: Response, next: NextFunction) {
        const dbTask: TaskModel = res.locals.task;
        if (!dbTask) {
            res.status(HttpStatus.NOT_FOUND);
        } else {
            res.status(HttpStatus.OK).json(toPublicTask(dbTask));
        }
    }

    public async postTask(req: RequestContext, res: Response, next: NextFunction) {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
                errors: validationErrors.array({onlyFirstError: true}),
            });
        } else {
            const insertData: Partial<TaskModel> = {
                name: req.body.name,
                description: req.body.description,
                status: TaskStatus.NEW,
                userId: new ObjectId(req.user.id),
                dueDate: req.body.dueDate,
            };

            const insertResult = await this.service.db
                .collection<Partial<TaskModel>>(TASK_COLLECTION)
                .insertOne(insertData);
            if (insertResult.result.ok) {
                res.status(HttpStatus.OK).json({
                    id: insertResult.ops[0]._id.toHexString(),
                });
            } else {
                console.error({
                    namespace: 'task-service.controllers.task.v1.postTask',
                    context: insertResult.result,
                });
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'An unexpected error occurred',
                });
            }
        }
    }

    public async updateTask(req: RequestContext, res: Response, next: NextFunction) {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
                errors: validationErrors.array({onlyFirstError: true}),
            });
        } else {
            let hasAField = false;
            const updateData: Partial<TaskModel> = {};
            if (req.body.name && req.body.name !== res.locals.task.name) {
                updateData.name = req.body.name;
                hasAField = true;
            }
            if (req.body.status && req.body.status !== res.locals.task.status) {
                updateData.status = req.body.status;
                hasAField = true;
            }
            if (req.body.description && req.body.description !== res.locals.task.description) {
                updateData.description = req.body.description;
                hasAField = true;
            }

            if (!hasAField) {
                res.status(HttpStatus.NOT_MODIFIED).json({
                    error: 'No fields',
                });
            } else {
                const updateResult = await this.service.db
                    .collection<Partial<TaskModel>>(TASK_COLLECTION)
                    .updateOne({_id: res.locals.task._id}, {$set: updateData});
                if (
                    updateResult.matchedCount &&
                    updateResult.modifiedCount &&
                    updateResult.result.ok
                ) {
                    res.status(HttpStatus.OK).end();
                } else {
                    console.error({
                        namespace: 'task-service.controllers.task.v1.updateTask',
                        context: updateResult,
                    });
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
                }
            }
        }
    }

    /**
     * Determines if the given user is authorized to see the requested task, and then
     * places it on `res.locals.task`
     * @param req
     * @param res
     * @param next
     */
    private async getAuthorizedTask(req: RequestContext, res: Response, next: NextFunction) {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({errors: validationErrors.array()});
        } else {
            const task = await this.service.db
                .collection<TaskModel>(TASK_COLLECTION)
                .findOne(new ObjectId(req.params.taskId));
            if (!task) {
                res.status(HttpStatus.NOT_FOUND).end();
            } else {
                if (!task.userId.equals(req.user.id)) {
                    res.status(HttpStatus.FORBIDDEN).end();
                } else {
                    res.locals.task = task;
                    next();
                }
            }
        }
    }
}
