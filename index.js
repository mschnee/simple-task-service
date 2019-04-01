const Service = require('./dist/service').default;

async function main() {
    const service = new Service({
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
    });

    await service.boot();
    await service.start();
}

main();
