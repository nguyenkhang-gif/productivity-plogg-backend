import { Injectable } from '@nestjs/common';
import { User } from '../../user/domain/user.entity';
import {
  TokenService,
  SessionMetadata,
} from 'src/modules/identity/auth/infrastructure/token/token.service';

@Injectable()
export class LoginUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(
    user: Omit<User, 'passwordHash'>,
    metadata: SessionMetadata = {},
  ) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const refresh_token = await this.tokenService.issueRefreshToken(
      payload,
      metadata,
    );
    const { token: access_token } = this.tokenService.issueAccessToken(
      payload,
      this.tokenService.getSessionId(refresh_token) ?? undefined,
    );
    return { access_token, refresh_token };
  }
}
