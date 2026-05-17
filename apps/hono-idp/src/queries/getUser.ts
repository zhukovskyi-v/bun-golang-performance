import type { UsersRepository } from '../repositories/users';

export type PublicUser = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export function getUserQuery(users: UsersRepository) {
  return async (id: string): Promise<PublicUser | null> => {
    const user = await users.findById(id);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  };
}
