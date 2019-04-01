import test, {ExecutionContext} from 'ava';

import * as supertest from 'supertest';

import {createUserAndGetToken, getClientFromService} from '../../../__tests__/test-helper';
import {HttpStatus} from '../../../models/HttpStatus';
import Service from '../../../Service';
import {PublicTaskModel, ServiceInterface} from '../../../types';

const TEST_USERNAME1 = '__testemail__v1_task_user1@test.com';
const TEST_PASSWORD1 = 'iamaprettyp4ssw04d!';

const TEST_USERNAME2 = '__testemail__v1_task_user2@test.com';
const TEST_PASSWORD2 = 'iamaprettierp4ssw04d!';

const USER1_TASKS: Array<Partial<PublicTaskModel>> = [
    {
        name: 'user1-task-1',
        description: 'task 1 for user 1',
    },
    {
        name: 'user1-task-2',
        description: 'task 2 for user 1',
    },
];

const USER2_TASKS: Array<Partial<PublicTaskModel>> = [
    {
        name: 'user2-task-1',
        description: 'task 1 for user 2',
    },
    {
        name: 'user2-task-2',
        description: 'task 2 for user 2',
    },
];

interface ServiceContext extends ExecutionContext {
    context: {
        client: supertest.SuperTest<supertest.Test>;
        service: ServiceInterface;
    };
}

test.beforeEach(async (t: ServiceContext) => {
    const service = new Service();
    await service.boot();
    await service.start();
    t.context = {
        service,
        client: getClientFromService(service),
    };
});

test.afterEach(async (t: ServiceContext) => {
    await t.context.service.stop();
});

test('Should let me create tasks', async (t: ServiceContext) => {
    const user1Token = await createUserAndGetToken(
        t.context.client,
        TEST_USERNAME1,
        TEST_PASSWORD1,
    );

    const createResponse = await t.context.client
        .post('/v1/tasks')
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${user1Token}`)
        .send(USER1_TASKS[0]);

    t.is(createResponse.status, HttpStatus.OK);
    t.truthy(createResponse.body.id);
});

test('Should let me update the name', async (t: ServiceContext) => {
    const user1Token = await createUserAndGetToken(
        t.context.client,
        TEST_USERNAME1,
        TEST_PASSWORD1,
    );

    const NEW_NAME = 'This is a new name';

    const createResponse = await t.context.client
        .post('/v1/tasks')
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${user1Token}`)
        .send(USER1_TASKS[0]);

    t.is(createResponse.status, HttpStatus.OK);
    t.truthy(createResponse.body.id);

    const getResponse = await t.context.client
        .get(`/v1/tasks/${createResponse.body.id}`)
        .set('Authorization', `bearer ${user1Token}`);

    t.deepEqual(getResponse.body, {id: createResponse.body.id, ...USER1_TASKS[0]});

    const updateResponse = await t.context.client
        .put(`/v1/tasks/${createResponse.body.id}`)
        .set('Authorization', `bearer ${user1Token}`)
        .send({name: NEW_NAME});

    t.is(updateResponse.status, HttpStatus.OK);

    const getResponse2 = await t.context.client
        .get(`/v1/tasks/${createResponse.body.id}`)
        .set('Authorization', `bearer ${user1Token}`);

    t.is(getResponse2.body.name, NEW_NAME);
});
