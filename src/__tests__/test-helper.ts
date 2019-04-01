import * as supertest from 'supertest';
import {ServiceInterface} from '../types';

export function getClientFromService(service: ServiceInterface) {
    return supertest(service.app);
}

export async function createUserAndGetToken(
    client: supertest.SuperTest<supertest.Test>,
    email: string,
    password: string,
) {
    const firstTry = await client
        .post('/v1/user/login')
        .set('Content-Type', 'application/json')
        .send({
            email,
            password,
        });

    if (firstTry.status === 404) {
        const createResponse = await client
            .post('/v1/user/create')
            .set('Content-Type', 'application/json')
            .send({
                email,
                password,
            });
        if (createResponse.status !== 200) {
            throw new Error(createResponse.body.error || 'Could not create user');
        }

        const secondTry = await client
            .post('/v1/user/login')
            .set('Content-Type', 'application/json')
            .send({
                email,
                password,
            });
        if (secondTry.status !== 200) {
            throw new Error(secondTry.body.error || 'Could not log-in');
        } else {
            return secondTry.body.token;
        }
    } else {
        return firstTry.body.token;
    }
}
