import {NextFunction, Response, Router} from 'express';
import * as sanitize from 'express-mongo-sanitize';
import {body, check, oneOf, validationResult} from 'express-validator/check';
import * as HttpStatus from 'http-status-codes';

import {TASK_COLLECTION} from '../../constants';
import Controller from '../../models/Controller';
import {Parsers, RequestContext, TaskModelV2, TaskStatusV2} from '../../types';

import V1TaskController from './v1.task.controller';

export default class V2TaskController extends V1TaskController {
    constructor(parent: Controller) {
        super(parent);
    }

    public getRoutes(routes = Router()) {
        routes.put(
            '/:taskId',
            (req: RequestContext, res: Response, next: NextFunction) => {
                console.log('in v2 put');
                next();
            },
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
                oneOf([
                    body('status').isEmpty(),
                    body('status').isIn([
                        TaskStatusV2.NEW,
                        TaskStatusV2.COMPLETED,
                        TaskStatusV2.IN_PROGRESS,
                    ]),
                ]),
            ],
            this.getAuthorizedTask.bind(this),
            this.updateTaskV2.bind(this),
        );

        return super.getRoutes(routes);
    }

    public async updateTaskV2(req: RequestContext, res: Response, next: NextFunction) {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
                errors: validationErrors.array({onlyFirstError: true}),
            });
        } else {
            let hasAField = false;
            const updateData: Partial<TaskModelV2> = {};
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
                    .collection<Partial<TaskModelV2>>(TASK_COLLECTION)
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
}
