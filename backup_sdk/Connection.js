"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInteractionContext = exports.createConnectionObject = void 0;
const IsomorphicWebSocket_1 = require("./IsomorphicWebSocket");
const ServerHealth_1 = require("./ServerHealth");
const errors_1 = require("./errors");
const createConnectionObject = (config) => {
    const _128MB = 128 * 1024 * 1024;
    const base = {
        host: config?.host ?? 'localhost',
        port: config?.port ?? 1337,
        tls: config?.tls ?? false,
        maxPayload: config?.maxPayload ?? _128MB,
	apiKey: config.apiKey ?? null
    };
    const hostAndPort = `${base.host}:${base.port}`;
    return {
        ...base,
        address: {
            http: `${base.tls ? 'https' : 'http'}://${hostAndPort}`,
            webSocket: `${base.tls ? 'wss' : 'ws'}://${hostAndPort}`
        }
    };
};
exports.createConnectionObject = createConnectionObject;
const createInteractionContext = async (errorHandler, closeHandler, options) => {
    const connection = (0, exports.createConnectionObject)(options?.connection);
    const health = await (0, ServerHealth_1.getServerHealth)({ connection });
    return new Promise((resolve, reject) => {
        if (health.lastTipUpdate === null) {
            return reject(new errors_1.ServerNotReady(health));
        }

        const socket = new IsomorphicWebSocket_1.WebSocket(connection.address.webSocket, 
            { maxPayload: connection.maxPayload, headers: { "api-key": connection.apiKey}});

        const closeOnCompletion = (options?.interactionType || 'LongRunning') === 'OneTime';
        const afterEach = (cb) => {
            if (closeOnCompletion) {
                socket.once('close', cb);
                socket.close();
            }
            else {
                cb();
            }
        };
        const onInitialError = (error) => {
            socket.removeAllListeners();
            return reject(error);
        };
        socket.on('error', onInitialError);
        socket.once('close', (_code, reason) => {
            socket.removeAllListeners();
            reject(new Error(reason));
        });
        socket.on('open', async () => {
            socket.removeListener('error', onInitialError);
            socket.on('error', errorHandler);
            socket.on('close', closeHandler);
            resolve({
                connection,
                socket,
                afterEach
            });
        });
    });
};
exports.createInteractionContext = createInteractionContext;
//# sourceMappingURL=Connection.js.map
