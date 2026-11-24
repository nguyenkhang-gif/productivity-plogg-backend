import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { TokenService } from './token.service';

class FakeCache {
  store = new Map<string, unknown>();
  sets = new Map<string, Set<string>>();
  async get<T>(key: string): Promise<T | null> {
    return (this.store.has(key) ? this.store.get(key) : null) as T | null;
  }
  async set(key: string, value: unknown): Promise<boolean> {
    this.store.set(key, JSON.parse(JSON.stringify(value)));
    return true;
  }
  async del(key: string) {
    this.store.delete(key);
  }
  async sadd(key: string, ...members: string[]) {
    const s = this.sets.get(key) ?? new Set<string>();
    members.forEach((m) => s.add(m));
    this.sets.set(key, s);
  }
  async srem(key: string, ...members: string[]) {
    members.forEach((m) => this.sets.get(key)?.delete(m));
  }
  async smembers(key: string) {
    return [...(this.sets.get(key) ?? [])];
  }
  async expire() {}
}

describe('TokenService refresh rotation', () => {
  const user = { sub: 'u1', email: 'a@b.c', role: 'user' };
  let cache: FakeCache;
  let service: TokenService;

  beforeEach(() => {
    cache = new FakeCache();
    service = new TokenService(
      new JwtService({ secret: 'x'.repeat(32) }),
      cache as unknown as CacheService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('rejects a replayed token inside the grace window without revoking the session', async () => {
    const original = await service.issueRefreshToken(user);
    const rotated = await service.rotateRefreshToken(original, user);

    await expect(service.verifyRefreshToken(original)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.verifyRefreshToken(rotated)).resolves.not.toBeNull();
  });

  it('revokes the session when an old token is replayed after the grace window', async () => {
    jest.useFakeTimers({ now: 1_000_000 });
    const original = await service.issueRefreshToken(user);
    const rotated = await service.rotateRefreshToken(original, user);

    jest.setSystemTime(1_000_000 + 31_000);
    await expect(service.verifyRefreshToken(original)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.verifyRefreshToken(rotated)).resolves.toBeNull();
    await expect(
      service.isSessionRevoked(service.getSessionId(rotated)!),
    ).resolves.toBe(true);
  });
});
