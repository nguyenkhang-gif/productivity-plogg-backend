import { Injectable } from '@nestjs/common';
import { User } from '../../core/domain/entities/user.entity';
import { TokenService } from 'src/infrastructure/auth/token/token.service';

@Injectable()
export class LoginUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(user: Omit<User, 'passwordHash'>) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const { token: access_token } = this.tokenService.issueAccessToken(payload);
    const refresh_token = await this.tokenService.issueRefreshToken(payload);
    return { access_token, refresh_token };
  }
}
