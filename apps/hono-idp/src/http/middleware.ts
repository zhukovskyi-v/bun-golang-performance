import type { MiddlewareHandler } from 'hono';
import { httpRequestDurationSeconds, httpRequestsTotal } from '../metrics/registry';

export const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  const start = process.hrtime.bigint();
  await next();
  const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1e9;
  const route = c.req.routePath || 'unknown';
  const labels = {
    method: c.req.method,
    route,
    status: String(c.res.status),
  };
  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, elapsedSeconds);
};

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const durationMs = Date.now() - start;
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'request',
      method: c.req.method,
      path: c.req.path,
      route: c.req.routePath || 'unknown',
      status: c.res.status,
      duration_ms: durationMs,
    }),
  );
};
