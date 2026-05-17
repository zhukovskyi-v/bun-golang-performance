import './otel/init';
import {Hono} from 'hono';
import {trace} from '@opentelemetry/api';
import {config} from './config';
import {db} from './database/client';
import {buildRoutes} from './http/routes';
import {metricsMiddleware, requestLogger} from './http/middleware';
import {DomainError} from './http/errors';

const app = new Hono();

app.use('*', metricsMiddleware);
app.use('*', requestLogger);

app.route('/', buildRoutes(db));

app.onError((err, c) => {
    if (err instanceof DomainError) {
        return c.json({
            error: err.message, code: err.code
        }, err.status as 400 | 401 | 403 | 404 | 409 | 422 | 500);
    }
    const status = (err as unknown as { status?: number }).status;
    if (typeof status === 'number' && status === 400) {
        return c.json({
            error: 'validation_failed', code: 'validation_failed'
        }, 400);
    }
    const traceId = trace.getActiveSpan()?.spanContext().traceId;
    console.error(
        JSON.stringify({
            level: 'error',
            msg: 'unhandled',
            err: err.message,
            stack: err.stack,
            trace_id: traceId,
        }),
    );
    return c.json({
        error: 'internal_error', code: 'internal_error'
    }, 500);
});

const server = Bun.serve({
    port: config.port,
    fetch: app.fetch,
});

console.log(JSON.stringify({level: 'info', msg: 'listening', port: config.port}));

let shuttingDown = false;
const shutdown = async (signal: string) => {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    console.log(JSON.stringify({level: 'info', msg: 'shutdown', signal}));
    server.stop(false);
    process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
