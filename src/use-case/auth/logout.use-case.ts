import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from 'src/infrastructure/auth/token/token.service';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(accessToken: string, userId: string, refreshToken?: string): Promise<void> {
    try {
      const payload = this.jwtService.decode(accessToken) as { jti?: string; exp?: number } | null;
      if (payload?.jti && payload?.exp) {
        await this.tokenService.blacklistAccessToken(payload.jti, payload.exp);
      }
    } catch {
      // token malformed — ignore, still revoke refresh
    }

    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken, userId);
    }
  }
}
