import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '../database/client';
import { sessions, type Session } from '../database/schema';

export class SessionsRepository {
  constructor(private readonly db: Db) {}

  async insert(userId: string, refreshTokenHash: string, expiresAt: Date): Promise<Session> {
    const [row] = await this.db
      .insert(sessions)
      .values({ userId, refreshTokenHash, expiresAt })
      .returning();
    return row;
  }

  async findActiveByHash(refreshTokenHash: string): Promise<Session | null> {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshTokenHash, refreshTokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async revoke(id: string): Promise<void> {
    await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id));
  }
}
