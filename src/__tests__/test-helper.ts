import * as HttpStatus from 'http-status-codes';
import * as supertest from 'supertest';
import {ServiceInterface} from '../types';

export function getClientFromService(service: ServiceInterface) {
    return supertest(service.app);
}

const memoizedUsers = new Map();

export async function createUserAndGetToken(
    client: supertest.SuperTest<supertest.Test>,
    email: string,
    password: string,
) {
    if (memoizedUsers.has(email)) {
        return memoizedUsers.get(email);
    } else {
        const firstTry = await client
            .post('/v1/user/login')
            .set('Content-Type', 'application/json')
            .send({
                email,
                password,
            });

        if (firstTry.status === HttpStatus.UNAUTHORIZED) {
            const createResponse = await client
                .post('/v1/user/create')
                .set('Content-Type', 'application/json')
                .send({
                    email,
                    password,
                });
            if (createResponse.status !== HttpStatus.OK) {
                throw new Error(createResponse.body.error || 'Could not create user');
            }

            const secondTry = await client
                .post('/v1/user/login')
                .set('Content-Type', 'application/json')
                .send({
                    email,
                    password,
                });
            if (secondTry.status !== HttpStatus.OK) {
                throw new Error(secondTry.body.error || 'Could not log-in');
            } else {
                memoizedUsers.set(email, secondTry.body.token);
                return secondTry.body.token;
            }
        } else {
            memoizedUsers.set(email, firstTry.body.token);
            return firstTry.body.token;
        }
    }
}
