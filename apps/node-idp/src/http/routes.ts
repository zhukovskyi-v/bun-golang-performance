import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Db } from '../database/client';
import { UsersRepository } from '../repositories/users';
import { SessionsRepository } from '../repositories/sessions';
import { registerCommand } from '../commands/register';
import { loginCommand } from '../commands/login';
import { refreshCommand } from '../commands/refresh';
import { verifyTokenQuery } from '../queries/verifyToken';
import { registry } from '../metrics/registry';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const verifySchema = z.object({
  access_token: z.string().min(1),
});

export function buildRoutes(db: Db): Hono {
  const usersRepo = new UsersRepository(db);
  const sessionsRepo = new SessionsRepository(db);

  const register = registerCommand(usersRepo);
  const login = loginCommand(usersRepo, sessionsRepo);
  const refresh = refreshCommand(sessionsRepo);
  const verify = verifyTokenQuery();

  const app = new Hono();

  app.get('/healthz', (c) => c.text('ok'));

  app.get('/metrics', async (c) => {
    const body = await registry.metrics();
    return c.text(body, 200, { 'content-type': registry.contentType });
  });

  app.post('/auth/register', zValidator('json', registerSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await register(body);
    return c.json(result, 201);
  });

  app.post('/auth/login', zValidator('json', loginSchema), async (c) => {
    const body = c.req.valid('json');
    return c.json(await login(body), 200);
  });

  app.post('/auth/refresh', zValidator('json', refreshSchema), async (c) => {
    const body = c.req.valid('json');
    return c.json(await refresh(body), 200);
  });

  app.post('/auth/verify', zValidator('json', verifySchema), async (c) => {
    const body = c.req.valid('json');
    return c.json(await verify(body), 200);
  });

  return app;
}
