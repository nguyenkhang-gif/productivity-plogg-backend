import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_TOKEN_PORT,
  SessionInfo,
  SessionTokenPort,
} from 'src/modules/identity/auth/domain/session-token.port';

@Injectable()
export class ListSessionsUseCase {
  constructor(
    @Inject(SESSION_TOKEN_PORT) private readonly tokens: SessionTokenPort,
  ) {}

  execute(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    return this.tokens.listSessions(userId, currentSessionId);
  }
}
