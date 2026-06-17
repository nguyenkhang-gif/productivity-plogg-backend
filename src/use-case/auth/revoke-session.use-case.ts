import { Injectable } from '@nestjs/common';
import { TokenService } from 'src/infrastructure/auth/token/token.service';

@Injectable()
export class RevokeSessionUseCase {
  constructor(private readonly tokenService: TokenService) {}

  // Revoke 1 session cụ thể
  async revokeOne(userId: string, sessionId: string): Promise<void> {
    const fakeToken = `${userId}.${sessionId}.x`;
    await this.tokenService.revokeRefreshToken(fakeToken, userId);
  }

  // Revoke tất cả trừ session hiện tại
  async revokeAll(userId: string, exceptSessionId?: string): Promise<void> {
    await this.tokenService.revokeAllSessions(userId, exceptSessionId);
  }
}
