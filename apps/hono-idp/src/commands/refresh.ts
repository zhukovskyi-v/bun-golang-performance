import type { SessionsRepository } from '../repositories/sessions';
import { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from '../auth/jwt';
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../auth/refreshToken';
import { InvalidToken } from '../http/errors';

export type RefreshInput = { refresh_token: string };
export type RefreshOutput = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export function refreshCommand(sessions: SessionsRepository) {
  return async (input: RefreshInput): Promise<RefreshOutput> => {
    const hash = hashRefreshToken(input.refresh_token);
    const session = await sessions.findActiveByHash(hash);
    if (!session) throw new InvalidToken();

    await sessions.revoke(session.id);

    const { token: access } = await signAccessToken(session.userId);
    const { token: newRefresh, hash: newHash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    await sessions.insert(session.userId, newHash, expiresAt);

    return {
      access_token: access,
      refresh_token: newRefresh,
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
    };
  };
}
