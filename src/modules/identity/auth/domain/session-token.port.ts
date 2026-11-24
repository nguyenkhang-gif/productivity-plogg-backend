export const SESSION_TOKEN_PORT = 'SESSION_TOKEN_PORT';

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

export interface SessionTokenPort {
  issueAccessToken(
    user: UserPayload,
    sessionId?: string,
  ): { token: string; jti: string };
  issueRefreshToken(
    user: UserPayload,
    metadata?: SessionMetadata,
  ): Promise<string>;
  verifyRefreshToken(
    token: string,
  ): Promise<{ payload: UserPayload; sessionId: string } | null>;
  rotateRefreshToken(oldToken: string, user: UserPayload): Promise<string>;
  getSessionId(refreshToken: string): string | null;
  revokeRefreshToken(token: string, userId: string): Promise<void>;
  revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void>;
  listSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<SessionInfo[]>;
  blacklistAccessToken(jti: string, exp: number): Promise<void>;
}
