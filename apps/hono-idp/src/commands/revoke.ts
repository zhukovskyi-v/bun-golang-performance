import type { SessionsRepository } from '../repositories/sessions';

export function revokeCommand(sessions: SessionsRepository) {
  return (sessionId: string): Promise<void> => sessions.revoke(sessionId);
}
