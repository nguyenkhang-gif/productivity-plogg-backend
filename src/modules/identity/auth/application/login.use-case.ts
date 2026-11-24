import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../user/domain/user.entity';
import {
  SESSION_TOKEN_PORT,
  SessionMetadata,
  SessionTokenPort,
} from 'src/modules/identity/auth/domain/session-token.port';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(SESSION_TOKEN_PORT) private readonly tokens: SessionTokenPort,
  ) {}

  async execute(
    user: Omit<User, 'passwordHash'>,
    metadata: SessionMetadata = {},
  ) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const refresh_token = await this.tokens.issueRefreshToken(
      payload,
      metadata,
    );
    const { token: access_token } = this.tokens.issueAccessToken(
      payload,
      this.tokens.getSessionId(refresh_token) ?? undefined,
    );
    return { access_token, refresh_token };
  }
}
