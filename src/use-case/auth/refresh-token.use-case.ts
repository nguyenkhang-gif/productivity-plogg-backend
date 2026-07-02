import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from 'src/infrastructure/auth/token/token.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const result = await this.tokenService.verifyRefreshToken(refreshToken);
    if (!result)
      throw new UnauthorizedException('Invalid or expired refresh token');

    const { payload, sessionId: _sessionId } = result;

    // Revoke current token (rotation)
    await this.tokenService.revokeRefreshToken(refreshToken, payload.sub);

    // Issue new pair — preserve sessionId metadata by passing empty metadata
    // (metadata already stored, new token gets fresh sessionId intentionally for rotation)
    const { token: access_token } = this.tokenService.issueAccessToken(payload);
    const refresh_token = await this.tokenService.issueRefreshToken(payload);

    return { access_token, refresh_token };
  }
}
