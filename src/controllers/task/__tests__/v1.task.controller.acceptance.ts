import test, {ExecutionContext} from 'ava';

import * as supertest from 'supertest';

import * as HttpStatus from 'http-status-codes';
import {createUserAndGetToken, getClientFromService} from '../../../__tests__/test-helper';

import Service from '../../../Service';
import {PublicTaskModel, ServiceInterface} from '../../../types';

const TEST_USERNAME1 = '__testemail__v1_task_user1@test.com';
const TEST_PASSWORD1 = 'iamaprettyp4ssw04d!';

const TEST_USERNAME2 = '__testemail__v1_task_user2@test.com';
const TEST_PASSWORD2 = 'iamaprettierp4ssw04d!';

const NOW_STRING = new Date().toISOString();
const USER1_TASKS: Array<Partial<PublicTaskModel>> = [
    {
        name: 'user1-task-1',
        description: 'task 1 for user 1',
        dueDate: NOW_STRING,
    },
    {
        name: 'user1-task-2',
        description: 'task 2 for user 1',
        dueDate: NOW_STRING,
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
        .post('/v1/task')
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
        .post('/v1/task')
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${user1Token}`)
        .send(USER1_TASKS[0]);

    t.is(createResponse.status, HttpStatus.OK);
    t.truthy(createResponse.body.id);

    const getResponse = await t.context.client
        .get(`/v1/task/${createResponse.body.id}`)
        .set('Authorization', `bearer ${user1Token}`);

    t.deepEqual(getResponse.body, {id: createResponse.body.id, status: 'new', ...USER1_TASKS[0]});

    const updateResponse = await t.context.client
        .put(`/v1/task/${createResponse.body.id}`)
        .set('Authorization', `bearer ${user1Token}`)
        .send({name: NEW_NAME});

    t.is(updateResponse.status, HttpStatus.OK);

    const getResponse2 = await t.context.client
        .get(`/v1/task/${createResponse.body.id}`)
        .set('Authorization', `bearer ${user1Token}`);

    t.is(getResponse2.body.name, NEW_NAME);
});

test('Should not let me set an invalid status', async (t: ServiceContext) => {
    const user1Token = await createUserAndGetToken(
        t.context.client,
        TEST_USERNAME1,
        TEST_PASSWORD1,
    );

    const NEW_STATUS = 'in-progress';

    const createResponse = await t.context.client
        .post('/v1/task')
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${user1Token}`)
        .send(USER1_TASKS[0]);

    t.is(createResponse.status, HttpStatus.OK);
    t.truthy(createResponse.body.id);

    const updateResponse = await t.context.client
        .put(`/v1/task/${createResponse.body.id}`)
        .set('Authorization', `bearer ${user1Token}`)
        .send({status: NEW_STATUS});

    t.is(updateResponse.status, HttpStatus.UNPROCESSABLE_ENTITY);
});

test("ACL - User1 shouldn't see User2's tasks", async (t: ServiceContext) => {
    const user1Token = await createUserAndGetToken(
        t.context.client,
        TEST_USERNAME1,
        TEST_PASSWORD1,
    );

    const user2Token = await createUserAndGetToken(
        t.context.client,
        TEST_USERNAME2,
        TEST_PASSWORD2,
    );

    const createResponse1 = await t.context.client
        .post('/v1/task')
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${user1Token}`)
        .send(USER1_TASKS[0]);

    // user 2 cannot get user 1's task
    const getResponse1 = await t.context.client
        .get(`/v1/task/${createResponse1.body.id}`)
        .set('Authorization', `bearer ${user2Token}`);

    t.is(getResponse1.status, HttpStatus.FORBIDDEN);

    // user 1 can still get user 1's task
    const getResponse2 = await t.context.client
        .get(`/v1/task/${createResponse1.body.id}`)
        .set('Authorization', `bearer ${user1Token}`);

    t.is(getResponse2.status, HttpStatus.OK);
});

test('Create and delete a task', async (t: ServiceContext) => {
    const user1Token = await createUserAndGetToken(
        t.context.client,
        TEST_USERNAME1,
        TEST_PASSWORD1,
    );

    const createResponse1 = await t.context.client
        .post('/v1/task')
        .set('Content-Type', 'application/json')
        .set('Authorization', `bearer ${user1Token}`)
        .send(USER1_TASKS[0]);

    // user 1 can still get user 1's task
    const getResponse1 = await t.context.client
        .get(`/v1/task/${createResponse1.body.id}`)
        .set('Authorization', `bearer ${user1Token}`);

    t.is(getResponse1.status, HttpStatus.OK);

    const deleteResponse = await t.context.client
        .delete(`/v1/task/${createResponse1.body.id}`)
        .set('Authorization', `bearer ${user1Token}`);

    t.is(deleteResponse.status, HttpStatus.NO_CONTENT);

    const getResponse2 = await t.context.client
        .get(`/v1/task/${createResponse1.body.id}`)
        .set('Authorization', `bearer ${user1Token}`);

    t.is(getResponse2.status, HttpStatus.NOT_FOUND);
});
