import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import {
  BLACKLIST_PREFIX,
  REFRESH_TOKEN_PREFIX,
  REFRESH_TTL_SECONDS,
} from './token.constants';

export interface UserPayload {
  sub: string;
  email: string;
  role?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
  ) {}

  issueAccessToken(user: UserPayload): { token: string; jti: string } {
    const jti = uuidv4();
    const token = this.jwtService.sign({ sub: user.sub, email: user.email, role: user.role, jti });
    return { token, jti };
  }

  async issueRefreshToken(user: UserPayload): Promise<string> {
    const token = uuidv4();
    await this.cacheService.set(
      `${REFRESH_TOKEN_PREFIX}${token}`,
      { userId: user.sub, email: user.email, role: user.role },
      REFRESH_TTL_SECONDS,
    );
    return token;
  }

  async blacklistAccessToken(jti: string, exp: number): Promise<void> {
    const remainingTTL = Math.max(exp - Math.floor(Date.now() / 1000), 1);
    await this.cacheService.set(`${BLACKLIST_PREFIX}${jti}`, '1', remainingTTL);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const val = await this.cacheService.get(`${BLACKLIST_PREFIX}${jti}`);
    return val !== null;
  }

  async verifyRefreshToken(token: string): Promise<UserPayload | null> {
    const data = await this.cacheService.get<{ userId: string; email: string; role?: string }>(
      `${REFRESH_TOKEN_PREFIX}${token}`,
    );
    if (!data) return null;
    return { sub: data.userId, email: data.email, role: data.role };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.cacheService.del(`${REFRESH_TOKEN_PREFIX}${token}`);
  }
}
