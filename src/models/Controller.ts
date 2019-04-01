import {Router} from 'express';
import {ServiceInterface} from '../types';

export default class Controller {
    public routes: Router;
    public service: ServiceInterface;

    constructor(parent: Controller | ServiceInterface) {
        this.service = (parent as Controller).service || parent;
        this.routes = Router();
    }
}
