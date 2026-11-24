import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  SESSION_TOKEN_PORT,
  SessionTokenPort,
} from 'src/modules/identity/auth/domain/session-token.port';
import { USER_REPOSITORY } from 'src/modules/identity/user/domain/user.repository.interface';
import type { UserRepository } from 'src/modules/identity/user/domain/user.repository.interface';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(SESSION_TOKEN_PORT) private readonly tokens: SessionTokenPort,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const result = await this.tokens.verifyRefreshToken(refreshToken);
    if (!result)
      throw new UnauthorizedException('Invalid or expired refresh token');

    const { payload, sessionId } = result;

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      await this.tokens.revokeRefreshToken(refreshToken, payload.sub);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const freshPayload = { sub: user.id, email: user.email, role: user.role };
    const refresh_token = await this.tokens.rotateRefreshToken(
      refreshToken,
      freshPayload,
    );
    const { token: access_token } = this.tokens.issueAccessToken(
      freshPayload,
      sessionId,
    );

    return { access_token, refresh_token };
  }
}
