import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from 'src/infrastructure/auth/token/token.service';
import { RefreshTokenUseCase } from './refresh-token.use-case';

class FakeCache {
  kv = new Map<string, string>();
  sets = new Map<string, Set<string>>();
  async get<T>(key: string): Promise<T | null> {
    const raw = this.kv.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  async set(key: string, value: unknown): Promise<boolean> {
    this.kv.set(key, JSON.stringify(value));
    return true;
  }
  async del(key: string) {
    this.kv.delete(key);
  }
  async sadd(key: string, ...m: string[]) {
    const s = this.sets.get(key) ?? new Set<string>();
    m.forEach((x) => s.add(x));
    this.sets.set(key, s);
  }
  async srem(key: string, ...m: string[]) {
    m.forEach((x) => this.sets.get(key)?.delete(x));
  }
  async smembers(key: string) {
    return [...(this.sets.get(key) ?? [])];
  }
  async expire() {}
}

describe('RefreshTokenUseCase', () => {
  const jwt = new JwtService({ secret: 'test-secret-test-secret-test-secret' });
  let cache: FakeCache;
  let tokens: TokenService;
  let dbUser: any;
  let userRepo: { findById: jest.Mock };
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    cache = new FakeCache();
    tokens = new TokenService(jwt, cache as any);
    dbUser = { id: 'u1', email: 'a@b.c', role: 'admin' };
    userRepo = { findById: jest.fn(async () => dbUser) };
    useCase = new RefreshTokenUseCase(tokens, userRepo as any);
  });

  const login = () =>
    tokens.issueRefreshToken({ sub: 'u1', email: 'a@b.c', role: 'admin' });

  it('uses the role and email from the database, not the session copy', async () => {
    const rt = await login();
    dbUser = { id: 'u1', email: 'new@b.c', role: 'user' };

    const out = await useCase.execute(rt);

    const decoded: any = jwt.decode(out.access_token);
    expect(decoded.role).toBe('user');
    expect(decoded.email).toBe('new@b.c');
    expect(decoded.sid).toBe(tokens.getSessionId(rt));

    dbUser = { id: 'u1', email: 'new@b.c', role: 'user' };
    const second: any = jwt.decode(
      (await useCase.execute(out.refresh_token)).access_token,
    );
    expect(second.role).toBe('user');
  });

  it('revokes the session and rejects when the user no longer exists', async () => {
    const rt = await login();
    userRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(rt)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(await tokens.listSessions('u1')).toHaveLength(0);
    expect(await tokens.isSessionRevoked(tokens.getSessionId(rt)!)).toBe(true);
  });

  it('revokes the whole session when a rotated token is replayed', async () => {
    const rt1 = await login();
    const { refresh_token: rt2 } = await useCase.execute(rt1);
    expect(await tokens.listSessions('u1')).toHaveLength(1);

    await expect(useCase.execute(rt1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(await tokens.listSessions('u1')).toHaveLength(0);
    await expect(useCase.execute(rt2)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
