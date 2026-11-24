import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  SESSION_TOKEN_PORT,
  SessionTokenPort,
} from 'src/modules/identity/auth/domain/session-token.port';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_TOKEN_PORT) private readonly tokens: SessionTokenPort,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    accessToken: string,
    userId: string,
    refreshToken?: string,
  ): Promise<void> {
    try {
      const payload = this.jwtService.decode(accessToken) as {
        jti?: string;
        exp?: number;
      } | null;
      if (payload?.jti && payload?.exp) {
        await this.tokens.blacklistAccessToken(payload.jti, payload.exp);
      }
    } catch {
      // token malformed — ignore, still revoke refresh
    }

    if (refreshToken) {
      await this.tokens.revokeRefreshToken(refreshToken, userId);
    }
  }
}
