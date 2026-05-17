import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export function generateRefreshToken(): { token: string; hash: string } {
  const raw = randomBytes(32);
  const token = raw.toString('base64url');
  const hash = sha256Hex(token);
  return { token, hash };
}

export function hashRefreshToken(token: string): string {
  return sha256Hex(token);
}

export function refreshTokenMatches(token: string, expectedHash: string): boolean {
  const candidate = Buffer.from(sha256Hex(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
