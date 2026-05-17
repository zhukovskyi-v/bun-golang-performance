import type {UsersRepository} from '../repositories/users';
import {hashPassword} from '../auth/argon2';
import {UserExists} from '../http/errors';

export type RegisterInput = { email: string; password: string };
export type RegisterOutput = { user_id: string };

export function registerCommand(users: UsersRepository) {
    return async (input: RegisterInput): Promise<RegisterOutput> => {
        const [existing, encrypted] = await Promise.all([
            users.findByEmail(input.email),
            hashPassword(input.password)
        ])

        if (existing) {
            throw new UserExists();
        }

        try {
            const user = await users.insert(input.email, encrypted);
            return {user_id: user.id};
        } catch (err) {
            if (isUniqueViolation(err)) throw new UserExists();
            throw err;
        }
    };
}

function isUniqueViolation(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}
