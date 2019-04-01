# simple-task-service

A companion piece to the [Loopback-based Task Service example](https://github.com/mschnee/task-service);

# Getting Started

Dependencies:

-   [docker](https://www.docker.com/get-started)
-   [NodeJS](https://nodejs.org)
-   `npm run install`

Unlike the loopback version, there is no OpenAPI explorer at `http://localhost:3000/explorer`, however the
basic api interfaces are the same:

```
GET /v1/stats
GET /v1/user/whoami
POST /v1/user/create
POST /v1/user/login
```

# Testing

## Run the integration tests

The integration tests will automatically stand up an environment using docker-compose, test the api
itself using supertest, and then bring down the environment and destroy the volumes.

```sh
npm run it
```
