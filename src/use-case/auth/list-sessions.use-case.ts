import { Injectable } from '@nestjs/common';
import { TokenService, SessionInfo } from 'src/infrastructure/auth/token/token.service';

@Injectable()
export class ListSessionsUseCase {
  constructor(private readonly tokenService: TokenService) {}

  execute(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    return this.tokenService.listSessions(userId, currentSessionId);
  }
}
