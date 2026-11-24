import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_TOKEN_PORT,
  SessionTokenPort,
} from 'src/modules/identity/auth/domain/session-token.port';

@Injectable()
export class RevokeSessionUseCase {
  constructor(
    @Inject(SESSION_TOKEN_PORT) private readonly tokens: SessionTokenPort,
  ) {}

  // Revoke 1 session cụ thể
  async revokeOne(userId: string, sessionId: string): Promise<void> {
    const fakeToken = `${userId}.${sessionId}.x`;
    await this.tokens.revokeRefreshToken(fakeToken, userId);
  }

  // Revoke tất cả trừ session hiện tại
  async revokeAll(userId: string, exceptSessionId?: string): Promise<void> {
    await this.tokens.revokeAllSessions(userId, exceptSessionId);
  }
}
