import { check } from 'k6';
import type { RefinedResponse, ResponseType } from 'k6/http';

type Resp = RefinedResponse<ResponseType | undefined>;

const parseJson = (r: Resp): Record<string, unknown> | null => {
  try {
    const body = r.body;
    if (typeof body !== 'string' || body.length === 0) return null;
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const checkRegister = (r: Resp): boolean => {
  const body = parseJson(r);
  return check(
    r,
    {
      'register: status 201': (res) => res.status === 201,
      'register: has user_id': () => typeof body?.user_id === 'string',
    },
    { endpoint: 'register' },
  );
};

export const checkLogin = (r: Resp): boolean => {
  const body = parseJson(r);
  return check(
    r,
    {
      'login: status 200': (res) => res.status === 200,
      'login: has access_token': () => typeof body?.access_token === 'string',
      'login: has refresh_token': () => typeof body?.refresh_token === 'string',
      'login: has expires_in': () => typeof body?.expires_in === 'number',
    },
    { endpoint: 'login' },
  );
};

export const checkRefresh = (r: Resp): boolean => {
  const body = parseJson(r);
  return check(
    r,
    {
      'refresh: status 200': (res) => res.status === 200,
      'refresh: has access_token': () => typeof body?.access_token === 'string',
      'refresh: has refresh_token': () => typeof body?.refresh_token === 'string',
    },
    { endpoint: 'refresh' },
  );
};

export const checkVerify = (r: Resp): boolean => {
  const body = parseJson(r);
  return check(
    r,
    {
      'verify: status 200': (res) => res.status === 200,
      'verify: valid true': () => body?.valid === true,
      'verify: has user_id': () => typeof body?.user_id === 'string',
    },
    { endpoint: 'verify' },
  );
};

export const extractTokens = (r: Resp): { access: string; refresh: string } | null => {
  const body = parseJson(r);
  if (!body) return null;
  const access = body.access_token;
  const refresh = body.refresh_token;
  if (typeof access !== 'string' || typeof refresh !== 'string') return null;
  return { access, refresh };
};

export const extractUserId = (r: Resp): string | null => {
  const body = parseJson(r);
  const id = body?.user_id;
  return typeof id === 'string' ? id : null;
};
