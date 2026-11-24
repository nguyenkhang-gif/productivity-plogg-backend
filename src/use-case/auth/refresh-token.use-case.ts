import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from 'src/infrastructure/auth/token/token.service';
import { USER_REPOSITORY } from 'src/core/domain/repositories/user.repository.interface';
import type { UserRepository } from 'src/core/domain/repositories/user.repository.interface';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly tokenService: TokenService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const result = await this.tokenService.verifyRefreshToken(refreshToken);
    if (!result)
      throw new UnauthorizedException('Invalid or expired refresh token');

    const { payload, sessionId } = result;

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      await this.tokenService.revokeRefreshToken(refreshToken, payload.sub);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const freshPayload = { sub: user.id, email: user.email, role: user.role };
    const refresh_token = await this.tokenService.rotateRefreshToken(
      refreshToken,
      freshPayload,
    );
    const { token: access_token } = this.tokenService.issueAccessToken(
      freshPayload,
      sessionId,
    );

    return { access_token, refresh_token };
  }
}
