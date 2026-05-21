import { eq } from 'drizzle-orm';
import type { Db } from '../database/client';
import { users, type User } from '../database/schema';

export class UsersRepository {
  constructor(private readonly db: Db) {}

  async insert(email: string, encryptedPassword: string): Promise<User> {
    const [row] = await this.db
      .insert(users)
      .values({ email, encryptedPassword })
      .returning();
    return row;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }
}
