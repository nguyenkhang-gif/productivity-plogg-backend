import {
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PutVaultUseCase } from 'src/modules/productivity/vault/application/put-vault.use-case';
import type {
  VaultPayload,
  VaultRepository,
} from 'src/modules/productivity/vault/domain/vault.repository.interface';

export interface VaultRepositoryHarness {
  repo: VaultRepository;
  newUser(): Promise<string>;
  cleanup(): Promise<void>;
}

const payload = (tag: string): VaultPayload => ({
  ciphertext: Buffer.from(`cipher-${tag}`).toString('base64'),
  iv: 'AAAAAAAAAAAAAAAA',
  wrappedKey: Buffer.from(`key-${tag}`).toString('base64'),
  kdf: { algo: 'PBKDF2-SHA256', salt: 'c2FsdHNhbHQ=', iterations: 600000 },
});

/** Behaviour every VaultRepository implementation must satisfy. */
export function describeVaultRepositoryContract(
  name: string,
  factory: () => Promise<VaultRepositoryHarness>,
): void {
  describe(`VaultRepository contract: ${name}`, () => {
    let h: VaultRepositoryHarness;
    let repo: VaultRepository;

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
    });

    afterAll(async () => {
      await h.cleanup();
    });

    it('findByUserAndScope returns null when missing', async () => {
      expect(
        await repo.findByUserAndScope(await h.newUser(), 'tasks'),
      ).toBeNull();
    });

    it('create stores the payload verbatim at version 1', async () => {
      const userId = await h.newUser();
      const created = await repo.create(userId, 'tasks', payload('a'));
      expect(created).toMatchObject({
        userId,
        scope: 'tasks',
        version: 1,
        ...payload('a'),
      });
      expect(created!.id).toMatch(/^[0-9a-f]{24}$/);
      expect(await repo.findByUserAndScope(userId, 'tasks')).toMatchObject({
        version: 1,
        ciphertext: payload('a').ciphertext,
        kdf: payload('a').kdf,
      });
    });

    it('create returns null when a vault already exists and keeps the original', async () => {
      const userId = await h.newUser();
      await repo.create(userId, 'tasks', payload('a'));
      expect(await repo.create(userId, 'tasks', payload('b'))).toBeNull();
      expect((await repo.findByUserAndScope(userId, 'tasks'))!.ciphertext).toBe(
        payload('a').ciphertext,
      );
    });

    it('keeps vaults of different users separate', async () => {
      const a = await h.newUser();
      const b = await h.newUser();
      await repo.create(a, 'tasks', payload('a'));
      expect(await repo.findByUserAndScope(b, 'tasks')).toBeNull();
      expect(await repo.create(b, 'tasks', payload('b'))).not.toBeNull();
    });

    describe('replaceIfVersion', () => {
      it('replaces the payload and bumps the version on a match', async () => {
        const userId = await h.newUser();
        await repo.create(userId, 'tasks', payload('a'));

        const v2 = await repo.replaceIfVersion(
          userId,
          'tasks',
          payload('b'),
          1,
        );
        expect(v2).toMatchObject({ version: 2, ...payload('b') });
        const v3 = await repo.replaceIfVersion(
          userId,
          'tasks',
          payload('c'),
          2,
        );
        expect(v3!.version).toBe(3);
        expect(
          (await repo.findByUserAndScope(userId, 'tasks'))!.ciphertext,
        ).toBe(payload('c').ciphertext);
      });

      it('returns null and changes nothing on a stale version', async () => {
        const userId = await h.newUser();
        await repo.create(userId, 'tasks', payload('a'));
        await repo.replaceIfVersion(userId, 'tasks', payload('b'), 1);

        expect(
          await repo.replaceIfVersion(userId, 'tasks', payload('x'), 1),
        ).toBeNull();
        const current = await repo.findByUserAndScope(userId, 'tasks');
        expect(current).toMatchObject({
          version: 2,
          ciphertext: payload('b').ciphertext,
        });
      });

      it('returns null when the vault does not exist', async () => {
        expect(
          await repo.replaceIfVersion(
            await h.newUser(),
            'tasks',
            payload('a'),
            1,
          ),
        ).toBeNull();
      });

      it('two parallel writes with the same base version: exactly one wins', async () => {
        const userId = await h.newUser();
        await repo.create(userId, 'tasks', payload('a'));

        const results = await Promise.all([
          repo.replaceIfVersion(userId, 'tasks', payload('left'), 1),
          repo.replaceIfVersion(userId, 'tasks', payload('right'), 1),
        ]);

        const winners = results.filter((r) => r !== null);
        expect(winners).toHaveLength(1);
        expect(winners[0]!.version).toBe(2);
        const stored = await repo.findByUserAndScope(userId, 'tasks');
        expect(stored!.version).toBe(2);
        expect(stored!.ciphertext).toBe(winners[0]!.ciphertext);
      });

      it('N parallel writers on one version: one winner, version bumped once', async () => {
        const userId = await h.newUser();
        await repo.create(userId, 'tasks', payload('a'));
        const results = await Promise.all(
          Array.from({ length: 12 }, (_, i) =>
            repo.replaceIfVersion(userId, 'tasks', payload(`w${i}`), 1),
          ),
        );
        expect(results.filter((r) => r !== null)).toHaveLength(1);
        expect((await repo.findByUserAndScope(userId, 'tasks'))!.version).toBe(
          2,
        );
      });
    });

    it('parallel creates: exactly one succeeds', async () => {
      const userId = await h.newUser();
      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          repo.create(userId, 'tasks', payload(`c${i}`)),
        ),
      );
      expect(results.filter((r) => r !== null)).toHaveLength(1);
    });

    describe('delete', () => {
      it('removes the vault and reports whether it existed', async () => {
        const userId = await h.newUser();
        await repo.create(userId, 'tasks', payload('a'));
        expect(await repo.delete(userId, 'tasks')).toBe(true);
        expect(await repo.findByUserAndScope(userId, 'tasks')).toBeNull();
        expect(await repo.delete(userId, 'tasks')).toBe(false);
      });

      it('allows creating a fresh version-1 vault afterwards', async () => {
        const userId = await h.newUser();
        await repo.create(userId, 'tasks', payload('a'));
        await repo.replaceIfVersion(userId, 'tasks', payload('b'), 1);
        await repo.delete(userId, 'tasks');
        expect(
          (await repo.create(userId, 'tasks', payload('c')))!.version,
        ).toBe(1);
      });
    });

    describe('PutVaultUseCase on top of the repository (HTTP semantics)', () => {
      const dto = (tag: string, baseVersion?: number) => ({
        ...payload(tag),
        baseVersion,
      });
      let put: PutVaultUseCase;
      beforeAll(() => {
        put = new PutVaultUseCase(repo);
      });

      it('create -> update -> stale update yields 409 with currentVersion', async () => {
        const userId = await h.newUser();
        expect(await put.execute(userId, 'tasks', dto('a'))).toEqual({
          version: 1,
        });
        expect(await put.execute(userId, 'tasks', dto('b', 1))).toEqual({
          version: 2,
        });

        const err = await put
          .execute(userId, 'tasks', dto('c', 1))
          .catch((e) => e);
        expect(err).toBeInstanceOf(ConflictException);
        expect(err.getResponse()).toMatchObject({
          error: 'VERSION_CONFLICT',
          currentVersion: 2,
        });
      });

      it('a second create without baseVersion is a 409', async () => {
        const userId = await h.newUser();
        await put.execute(userId, 'tasks', dto('a'));
        await expect(
          put.execute(userId, 'tasks', dto('b')),
        ).rejects.toBeInstanceOf(ConflictException);
      });

      it('update of a missing vault is a 404', async () => {
        await expect(
          put.execute(await h.newUser(), 'tasks', dto('a', 3)),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it('rejects ciphertext over the 64KB cap with 413 and stores nothing', async () => {
        const userId = await h.newUser();
        const big = { ...dto('a'), ciphertext: 'A'.repeat(87_384 + 4) };
        await expect(put.execute(userId, 'tasks', big)).rejects.toBeInstanceOf(
          PayloadTooLargeException,
        );
        expect(await repo.findByUserAndScope(userId, 'tasks')).toBeNull();
      });

      it('accepts ciphertext exactly at the cap', async () => {
        const userId = await h.newUser();
        const atCap = { ...dto('a'), ciphertext: 'A'.repeat(87_384) };
        expect(await put.execute(userId, 'tasks', atCap)).toEqual({
          version: 1,
        });
        expect(
          (await repo.findByUserAndScope(userId, 'tasks'))!.ciphertext,
        ).toHaveLength(87_384);
      });

      it('two parallel PUTs with the same baseVersion: one 200, one 409', async () => {
        const userId = await h.newUser();
        await put.execute(userId, 'tasks', dto('a'));
        const results = await Promise.allSettled([
          put.execute(userId, 'tasks', dto('left', 1)),
          put.execute(userId, 'tasks', dto('right', 1)),
        ]);
        const ok = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter(
          (r): r is PromiseRejectedResult => r.status === 'rejected',
        );
        expect(ok).toHaveLength(1);
        expect(failed).toHaveLength(1);
        expect(failed[0].reason).toBeInstanceOf(ConflictException);
        expect(failed[0].reason.getResponse()).toMatchObject({
          currentVersion: 2,
        });
      });
    });
  });
}
