import { sign, verify } from 'hono/jwt';
import { config } from '../config';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export type AccessTokenClaims = {
  sub: string;
  iat: number;
  exp: number;
  jti: string;
};

export async function signAccessToken(userId: string): Promise<{ token: string; exp: number; jti: string }> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ACCESS_TOKEN_TTL_SECONDS;
  const jti = crypto.randomUUID();
  const payload: AccessTokenClaims = { sub: userId, iat, exp, jti };
  const token = await sign(payload, config.jwtSecret, 'HS256');
  return { token, exp, jti };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const decoded = await verify(token, config.jwtSecret, 'HS256');
    return decoded as AccessTokenClaims;
  } catch {
    return null;
  }
}
