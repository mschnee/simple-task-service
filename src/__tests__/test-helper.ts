import * as supertest from 'supertest';
import {ServiceInterface} from '../types';

export function getClientFromService(service: ServiceInterface) {
    return supertest(service.app);
}
