import type {UsersRepository} from '../repositories/users';
import type {SessionsRepository} from '../repositories/sessions';
import {verifyPassword} from '../auth/argon2';
import {signAccessToken, ACCESS_TOKEN_TTL_SECONDS} from '../auth/jwt';
import {generateRefreshToken, REFRESH_TOKEN_TTL_SECONDS} from '../auth/refreshToken';
import {InvalidCredentials} from '../http/errors';

export type LoginInput = { email: string; password: string };
export type LoginOutput = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
};

export function loginCommand(users: UsersRepository, sessions: SessionsRepository) {
    return async (input: LoginInput): Promise<LoginOutput> => {
        const user = await users.findByEmail(input.email);

        if (!user) {
            throw new InvalidCredentials();
        }
        const ok = await verifyPassword(user.encryptedPassword, input.password);
        if (!ok) {
            throw new InvalidCredentials();
        }

        const {token: access} = await signAccessToken(user.id);
        const {token: refresh, hash} = generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
        await sessions.insert(user.id, hash, expiresAt);

        return {
            access_token: access,
            refresh_token: refresh,
            expires_in: ACCESS_TOKEN_TTL_SECONDS,
        };
    };
}
