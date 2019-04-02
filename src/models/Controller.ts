import {Router} from 'express';
import {ServiceInterface} from '../types';

export default abstract class Controller {
    public service: ServiceInterface;

    constructor(parent: Controller | ServiceInterface, routes: Router = Router()) {
        this.service = (parent as Controller).service || parent;
    }

    public abstract getRoutes(router?: Router): Router;
}
