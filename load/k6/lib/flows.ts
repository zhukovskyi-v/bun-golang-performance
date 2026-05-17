import { group, sleep } from 'k6';
import http from 'k6/http';
import type { Params } from 'k6/http';
import { TARGET_URL, HTTP_TIMEOUT, SEED_CONCURRENCY } from '../config';
import {
  checkLogin,
  checkRefresh,
  checkRegister,
  checkVerify,
  extractTokens,
  extractUserId,
} from './checks';
import { generateEmail, generatePassword, type User } from './data';
import {
  flowNewUserDuration,
  flowReturningUserDuration,
  flowVerifyOnlyDuration,
  refreshesCompleted,
  tokensIssued,
  tokensVerified,
} from './metrics';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const tinyThink = (): void => {
  sleep(0.2 + Math.random() * 0.3);
};

const params = (endpoint: string): Params => ({
  headers: JSON_HEADERS,
  timeout: HTTP_TIMEOUT,
  tags: { endpoint },
});

const url = (path: string): string => `${TARGET_URL}${path}`;

const postRegister = (email: string, password: string) =>
  http.post(url('/auth/register'), JSON.stringify({ email, password }), params('register'));

const postLogin = (email: string, password: string) =>
  http.post(url('/auth/login'), JSON.stringify({ email, password }), params('login'));

const postRefresh = (refreshToken: string) =>
  http.post(url('/auth/refresh'), JSON.stringify({ refresh_token: refreshToken }), params('refresh'));

const postVerify = (accessToken: string) =>
  http.post(url('/auth/verify'), JSON.stringify({ access_token: accessToken }), params('verify'));

const verifyTimes = (token: string, n: number): void => {
  for (let i = 0; i < n; i++) {
    const r = postVerify(token);
    if (checkVerify(r)) tokensVerified.add(1);
    tinyThink();
  }
};

export const seedUsers = (count: number, prefix = 'seed'): User[] => {
  const users: User[] = [];
  const startedAt = Date.now();
  const batchParams = { ...params('register'), tags: { endpoint: 'register', phase: 'seed' } };

  for (let i = 0; i < count; i += SEED_CONCURRENCY) {
    const batch: Array<{
      method: 'POST';
      url: string;
      body: string;
      params: Params;
      _email: string;
      _password: string;
    }> = [];
    const limit = Math.min(SEED_CONCURRENCY, count - i);
    for (let j = 0; j < limit; j++) {
      const email = generateEmail(prefix, i + j);
      const password = generatePassword();
      batch.push({
        method: 'POST',
        url: url('/auth/register'),
        body: JSON.stringify({ email, password }),
        params: batchParams,
        _email: email,
        _password: password,
      });
    }
    const responses = http.batch(batch.map(({ _email, _password, ...req }) => {
      void _email;
      void _password;
      return req;
    }));
    for (let j = 0; j < responses.length; j++) {
      const r = responses[j];
      const meta = batch[j];
      if (r.status !== 201) {
        console.error(`seed: register failed at index ${i + j}: status=${r.status} body=${r.body}`);
        continue;
      }
      const userId = extractUserId(r) ?? undefined;
      users.push({ email: meta._email, password: meta._password, userId });
    }
    if ((i + limit) % 50 === 0 || i + limit === count) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`seed: ${users.length}/${count} registered (${elapsed}s, concurrency=${SEED_CONCURRENCY})`);
    }
  }

  if (users.length === 0) {
    throw new Error('seed: failed to register any users — aborting');
  }
  return users;
};

export const newUserFlow = (): void => {
  const start = Date.now();
  const email = generateEmail('new', __VU * 1_000_000 + __ITER);
  const password = generatePassword();

  group('new_user', () => {
    group('register', () => {
      const r = postRegister(email, password);
      checkRegister(r);
      tinyThink();
    });

    let access = '';
    let refresh = '';

    group('login', () => {
      const r = postLogin(email, password);
      if (checkLogin(r)) tokensIssued.add(1);
      const t = extractTokens(r);
      if (t) {
        access = t.access;
        refresh = t.refresh;
      }
      tinyThink();
    });

    if (!access || !refresh) return;

    group('verify_burst_1', () => verifyTimes(access, 3));

    group('refresh', () => {
      const r = postRefresh(refresh);
      if (checkRefresh(r)) refreshesCompleted.add(1);
      const t = extractTokens(r);
      if (t) {
        access = t.access;
        refresh = t.refresh;
      }
      tinyThink();
    });

    group('verify_burst_2', () => verifyTimes(access, 2));
  });

  flowNewUserDuration.add(Date.now() - start);
};

export const returningUserFlow = (user: User): void => {
  const start = Date.now();

  group('returning_user', () => {
    let access = '';
    let refresh = '';

    group('login', () => {
      const r = postLogin(user.email, user.password);
      if (checkLogin(r)) tokensIssued.add(1);
      const t = extractTokens(r);
      if (t) {
        access = t.access;
        refresh = t.refresh;
      }
      tinyThink();
    });

    if (!access || !refresh) return;

    group('verify_burst_1', () => verifyTimes(access, 5));

    group('refresh', () => {
      const r = postRefresh(refresh);
      if (checkRefresh(r)) refreshesCompleted.add(1);
      const t = extractTokens(r);
      if (t) {
        access = t.access;
        refresh = t.refresh;
      }
      tinyThink();
    });

    group('verify_burst_2', () => verifyTimes(access, 3));
  });

  flowReturningUserDuration.add(Date.now() - start);
};

type CachedToken = { access: string; refresh: string; obtainedAt: number };
const tokenCache = new Map<number, CachedToken>();
const TOKEN_CACHE_TTL_MS = 12 * 60 * 1000;

const getOrRefreshToken = (user: User): string | null => {
  const cached = tokenCache.get(__VU);
  const now = Date.now();
  if (cached && now - cached.obtainedAt < TOKEN_CACHE_TTL_MS) {
    return cached.access;
  }
  const r = postLogin(user.email, user.password);
  if (!checkLogin(r)) return null;
  tokensIssued.add(1);
  const t = extractTokens(r);
  if (!t) return null;
  tokenCache.set(__VU, { access: t.access, refresh: t.refresh, obtainedAt: now });
  return t.access;
};

export const tokenVerifyOnlyFlow = (user: User): void => {
  const start = Date.now();
  const token = getOrRefreshToken(user);
  if (!token) {
    flowVerifyOnlyDuration.add(Date.now() - start);
    return;
  }
  group('token_verify_only', () => {
    verifyTimes(token, 10);
  });
  flowVerifyOnlyDuration.add(Date.now() - start);
};
