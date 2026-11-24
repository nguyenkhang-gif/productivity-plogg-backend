import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import {
  BLACKLIST_PREFIX,
  ACCESS_TOKEN_MAX_TTL_SECONDS,
  MAX_SESSIONS_PER_USER,
  OAUTH_CODE_PREFIX,
  OAUTH_CODE_TTL_SECONDS,
  REFRESH_TOKEN_PREFIX,
  REFRESH_TTL_SECONDS,
  REFRESH_USED_PREFIX,
  REVOKED_SESSION_PREFIX,
  SESSION_PREFIX,
} from './token.constants';

export interface UserPayload {
  sub: string;
  email: string;
  role?: string;
}

export interface SessionMetadata {
  userAgent?: string;
  ip?: string;
}

export interface SessionInfo {
  sessionId: string;
  createdAt: string;
  browser: string;
  os: string;
  ip: string;
}

interface StoredSession {
  tokenHash: string;
  createdAt: number;
  userAgent: string;
  ip: string;
  email: string;
  role?: string;
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function parseUserAgent(ua: string): { browser: string; os: string } {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua) && !/Chrome/.test(ua)
          ? 'Safari'
          : /okhttp/.test(ua)
            ? 'Android App'
            : 'Unknown';

  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown';

  return { browser, os };
}

function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
  ) {}

  issueAccessToken(
    user: UserPayload,
    sessionId?: string,
  ): { token: string; jti: string } {
    const jti = randomUUID();
    const token = this.jwtService.sign({
      sub: user.sub,
      email: user.email,
      role: user.role,
      jti,
      ...(sessionId ? { sid: sessionId } : {}),
    });
    return { token, jti };
  }

  // Format: <userId>.<sessionId>.<rawSecret>
  async issueRefreshToken(
    user: UserPayload,
    metadata: SessionMetadata = {},
  ): Promise<string> {
    const sessionId = randomUUID();
    const rawSecret = randomUUID();
    const tokenHash = hashToken(rawSecret);

    const stored: StoredSession = {
      tokenHash,
      createdAt: Date.now(),
      userAgent: metadata.userAgent ?? '',
      ip: metadata.ip ?? '',
      email: user.email,
      role: user.role,
    };

    const tokenKey = `${REFRESH_TOKEN_PREFIX}${user.sub}:${sessionId}`;
    const sessionKey = `${SESSION_PREFIX}${user.sub}`;

    // Enforce max sessions — xóa session cũ nhất nếu vượt giới hạn
    const existingIds: string[] = await this.cacheService.smembers(sessionKey);
    if (existingIds.length >= MAX_SESSIONS_PER_USER) {
      const sessions = await Promise.all(
        existingIds.map(async (sid) => {
          const data = await this.cacheService.get<StoredSession>(
            `${REFRESH_TOKEN_PREFIX}${user.sub}:${sid}`,
          );
          return { sid, createdAt: data?.createdAt ?? 0 };
        }),
      );
      sessions.sort((a, b) => a.createdAt - b.createdAt);
      const oldest = sessions[0];
      await this.cacheService.del(
        `${REFRESH_TOKEN_PREFIX}${user.sub}:${oldest.sid}`,
      );
      await this.cacheService.srem(sessionKey, oldest.sid);
    }

    const ok = await this.cacheService.set(
      tokenKey,
      stored,
      REFRESH_TTL_SECONDS,
    );
    if (!ok) throw new ServiceUnavailableException('Session store unavailable');

    await this.cacheService.sadd(sessionKey, sessionId);
    await this.cacheService.expire(sessionKey, REFRESH_TTL_SECONDS);

    return `${user.sub}.${sessionId}.${rawSecret}`;
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<{ payload: UserPayload; sessionId: string } | null> {
    const parts = token.split('.');
    // UUID có dấu '-' nên split('.') cho đúng 3 phần
    if (parts.length !== 3) return null;

    const [userId, sessionId, rawSecret] = parts;

    const usedSessionId = await this.cacheService.get<string>(
      `${REFRESH_USED_PREFIX}${hashToken(rawSecret)}`,
    );
    if (usedSessionId) {
      await this.revokeRefreshToken(`${userId}.${usedSessionId}.x`, userId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const tokenKey = `${REFRESH_TOKEN_PREFIX}${userId}:${sessionId}`;
    const stored = await this.cacheService.get<StoredSession>(tokenKey);

    if (!stored) return null;

    // Detect reuse attack: key tồn tại nhưng hash không khớp
    if (stored.tokenHash !== hashToken(rawSecret)) {
      await this.revokeAllSessions(userId);
      return null;
    }

    return {
      payload: { sub: userId, email: stored.email ?? '', role: stored.role },
      sessionId,
    };
  }

  async rotateRefreshToken(
    oldToken: string,
    user: UserPayload,
  ): Promise<string> {
    const parts = oldToken.split('.');
    if (parts.length !== 3 || parts[0] !== user.sub) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const [userId, sessionId, oldSecret] = parts;
    const tokenKey = `${REFRESH_TOKEN_PREFIX}${userId}:${sessionId}`;
    const previous = await this.cacheService.get<StoredSession>(tokenKey);
    if (!previous) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const rawSecret = randomUUID();
    const stored: StoredSession = {
      ...previous,
      tokenHash: hashToken(rawSecret),
      email: user.email,
      role: user.role,
    };

    const tombstoned = await this.cacheService.set(
      `${REFRESH_USED_PREFIX}${hashToken(oldSecret)}`,
      sessionId,
      REFRESH_TTL_SECONDS,
    );
    const ok =
      tombstoned &&
      (await this.cacheService.set(tokenKey, stored, REFRESH_TTL_SECONDS));
    if (!ok) throw new ServiceUnavailableException('Session store unavailable');

    await this.cacheService.sadd(`${SESSION_PREFIX}${userId}`, sessionId);
    await this.cacheService.expire(
      `${SESSION_PREFIX}${userId}`,
      REFRESH_TTL_SECONDS,
    );

    return `${userId}.${sessionId}.${rawSecret}`;
  }

  getSessionId(refreshToken: string): string | null {
    const parts = refreshToken.split('.');
    return parts.length === 3 ? parts[1] : null;
  }

  async revokeRefreshToken(token: string, userId: string): Promise<void> {
    const parts = token.split('.');
    if (parts.length !== 3) return;
    const [, sessionId] = parts;
    await this.cacheService.del(
      `${REFRESH_TOKEN_PREFIX}${userId}:${sessionId}`,
    );
    await this.cacheService.srem(`${SESSION_PREFIX}${userId}`, sessionId);
    await this.markSessionRevoked(sessionId);
  }

  async markSessionRevoked(sessionId: string): Promise<void> {
    await this.cacheService.set(
      `${REVOKED_SESSION_PREFIX}${sessionId}`,
      '1',
      ACCESS_TOKEN_MAX_TTL_SECONDS,
    );
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    const val = await this.cacheService.get(
      `${REVOKED_SESSION_PREFIX}${sessionId}`,
    );
    return val !== null;
  }

  async createOAuthCode(tokens: {
    access_token: string;
    refresh_token: string;
  }): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    const ok = await this.cacheService.set(
      `${OAUTH_CODE_PREFIX}${hashToken(code)}`,
      tokens,
      OAUTH_CODE_TTL_SECONDS,
    );
    if (!ok) throw new ServiceUnavailableException('Session store unavailable');
    return code;
  }

  async consumeOAuthCode(
    code: string,
  ): Promise<{ access_token: string; refresh_token: string } | null> {
    const key = `${OAUTH_CODE_PREFIX}${hashToken(code)}`;
    const tokens = await this.cacheService.get<{
      access_token: string;
      refresh_token: string;
    }>(key);
    if (!tokens) return null;
    await this.cacheService.del(key);
    return tokens;
  }

  async revokeAllSessions(
    userId: string,
    exceptSessionId?: string,
  ): Promise<void> {
    const sessionKey = `${SESSION_PREFIX}${userId}`;
    const sessionIds: string[] = await this.cacheService.smembers(sessionKey);

    const toRevoke = exceptSessionId
      ? sessionIds.filter((sid) => sid !== exceptSessionId)
      : sessionIds;

    await Promise.all(
      toRevoke.map(async (sid) => {
        await this.cacheService.del(`${REFRESH_TOKEN_PREFIX}${userId}:${sid}`);
        await this.markSessionRevoked(sid);
      }),
    );

    if (exceptSessionId) {
      await Promise.all(
        toRevoke.map((sid) => this.cacheService.srem(sessionKey, sid)),
      );
    } else {
      await this.cacheService.del(sessionKey);
    }
  }

  async listSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<SessionInfo[]> {
    const sessionIds: string[] = await this.cacheService.smembers(
      `${SESSION_PREFIX}${userId}`,
    );

    const sessions = await Promise.all(
      sessionIds.map(async (sid) => {
        const data = await this.cacheService.get<StoredSession>(
          `${REFRESH_TOKEN_PREFIX}${userId}:${sid}`,
        );
        if (!data) return null;
        const { browser, os } = parseUserAgent(data.userAgent);
        return {
          sessionId: sid,
          createdAt: new Date(data.createdAt).toISOString(),
          browser,
          os,
          ip: maskIp(data.ip),
          isCurrent: sid === currentSessionId,
        };
      }),
    );

    return sessions
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime(),
      ) as SessionInfo[];
  }

  async blacklistAccessToken(jti: string, exp: number): Promise<void> {
    const remainingTTL = Math.max(exp - Math.floor(Date.now() / 1000), 1);
    await this.cacheService.set(`${BLACKLIST_PREFIX}${jti}`, '1', remainingTTL);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const val = await this.cacheService.get(`${BLACKLIST_PREFIX}${jti}`);
    return val !== null;
  }
}
