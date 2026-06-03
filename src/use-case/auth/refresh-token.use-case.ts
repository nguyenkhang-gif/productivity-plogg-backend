import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from 'src/infrastructure/auth/token/token.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) throw new UnauthorizedException('Invalid or expired refresh token');

    await this.tokenService.revokeRefreshToken(refreshToken);

    const { token: access_token } = this.tokenService.issueAccessToken(payload);
    const refresh_token = await this.tokenService.issueRefreshToken(payload);
    return { access_token, refresh_token };
  }
}
