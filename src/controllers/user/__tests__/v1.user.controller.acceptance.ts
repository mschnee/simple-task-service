import test, {ExecutionContext} from 'ava';
import * as HttpStatus from 'http-status-codes';
import * as supertest from 'supertest';

import {getClientFromService} from '../../../__tests__/test-helper';
import Service from '../../../Service';
import {ServiceInterface} from '../../../types';

const TEST_USERNAME = '__testemail@test.com';
const TEST_PASSWORD = 'iamaprettyp4ssw04d!';

const NOT_USERNAME = '__test_notauser@test.com';
const NOT_PASSWORD = 'anyl1ttl3oldp4ssword';

interface ServiceContext extends ExecutionContext {
    context: {
        client: supertest.SuperTest<supertest.Test>;
        service: ServiceInterface;
    };
}

test.before(async (t: ServiceContext) => {
    const service = new Service();
    await service.boot();
    await service.start();
    t.context = {
        service,
        client: getClientFromService(service),
    };
});

test.after(async (t: ServiceContext) => {
    await t.context.service.stop();
});

test('Shouldnt log into a non-existant usar', async (t: ServiceContext) => {
    const loginResponse = await t.context.client
        .post('/v1/user/login')
        .set('Content-Type', 'application/json')
        .send({
            email: NOT_USERNAME,
            password: NOT_PASSWORD,
        });

    t.is(loginResponse.status, HttpStatus.UNAUTHORIZED);
});

test('Should let me create a user', async (t: ServiceContext) => {
    const failingWhoami = await t.context.client.get('/v1/user/whoami');
    t.is(failingWhoami.status, HttpStatus.UNAUTHORIZED);

    const createResponse = await t.context.client
        .post('/v1/user/create')
        .set('Content-Type', 'application/json')
        .send({
            email: TEST_USERNAME,
            password: TEST_PASSWORD,
        });

    t.is(createResponse.status, HttpStatus.OK);
    t.truthy(createResponse.body.id);

    const loginResponse = await t.context.client
        .post('/v1/user/login')
        .set('Content-Type', 'application/json')
        .send({
            email: TEST_USERNAME,
            password: TEST_PASSWORD,
        });

    t.is(loginResponse.status, HttpStatus.OK);
    t.truthy(loginResponse.body.token);

    const successfulWhoami = await t.context.client
        .get('/v1/user/whoami')
        .set('Authorization', `bearer ${loginResponse.body.token}`);

    t.is(successfulWhoami.status, HttpStatus.OK);
    t.is(successfulWhoami.body.email, TEST_USERNAME);
});

const TEST_USERNAME1 = '__testemail1@test.com';
const TEST_PASSWORD1 = '1amaprettyp4ssw04d!';

test('Re-creating the same user should be forbidden', async (t: ServiceContext) => {
    const failingWhoami = await t.context.client.get('/v1/user/whoami');
    t.is(failingWhoami.status, HttpStatus.UNAUTHORIZED);

    const createResponse1 = await t.context.client
        .post('/v1/user/create')
        .set('Content-Type', 'application/json')
        .send({
            email: TEST_USERNAME1,
            password: TEST_PASSWORD1,
        });

    t.is(createResponse1.status, HttpStatus.OK);
    t.truthy(createResponse1.body.id);

    const createResponse2 = await t.context.client
        .post('/v1/user/create')
        .set('Content-Type', 'application/json')
        .send({
            email: TEST_USERNAME1,
            password: TEST_PASSWORD1,
        });

    t.is(createResponse2.status, HttpStatus.CONFLICT);
});
