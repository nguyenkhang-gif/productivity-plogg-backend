import { Test } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  MAX_CIPHERTEXT_B64_LENGTH,
  PutVaultUseCase,
} from './put-vault.use-case';
import {
  VAULT_REPOSITORY,
  VaultRepository,
} from 'src/core/domain/repositories/vault.repository.interface';
import { Vault } from 'src/core/domain/entities/vault.entity';
import { PutVaultDto } from 'src/core/dtos/vault.dto';

describe('PutVaultUseCase', () => {
  let useCase: PutVaultUseCase;
  let repo: jest.Mocked<VaultRepository>;

  const dto = (overrides: Partial<PutVaultDto> = {}): PutVaultDto => ({
    ciphertext: 'aGVsbG8=',
    iv: 'AAAAAAAAAAAAAAAA',
    wrappedKey: 'd3JhcHBlZA==',
    kdf: { algo: 'PBKDF2-SHA256', salt: 'c2FsdA==', iterations: 600000 },
    ...overrides,
  });

  const vault = (version: number): Vault =>
    new Vault({ id: 'v1', userId: 'u1', scope: 'tasks', version });

  beforeEach(async () => {
    repo = {
      findByUserAndScope: jest.fn(),
      create: jest.fn(),
      replaceIfVersion: jest.fn(),
      delete: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        PutVaultUseCase,
        { provide: VAULT_REPOSITORY, useValue: repo },
      ],
    }).compile();
    useCase = module.get(PutVaultUseCase);
  });

  it('creates the vault at version 1 when no baseVersion is sent', async () => {
    repo.create.mockResolvedValue(vault(1));

    const res = await useCase.execute('u1', 'tasks', dto());

    expect(res).toEqual({ version: 1 });
    expect(repo.create).toHaveBeenCalledWith('u1', 'tasks', {
      ciphertext: 'aGVsbG8=',
      iv: 'AAAAAAAAAAAAAAAA',
      wrappedKey: 'd3JhcHBlZA==',
      kdf: { algo: 'PBKDF2-SHA256', salt: 'c2FsdA==', iterations: 600000 },
    });
    expect(repo.replaceIfVersion).not.toHaveBeenCalled();
  });

  it('409 with currentVersion when creating but a vault already exists', async () => {
    repo.create.mockResolvedValue(null);
    repo.findByUserAndScope.mockResolvedValue(vault(4));

    const err = await useCase.execute('u1', 'tasks', dto()).catch((e) => e);

    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({
      error: 'VERSION_CONFLICT',
      currentVersion: 4,
    });
  });

  it('replaces atomically and returns the incremented version on CAS success', async () => {
    repo.replaceIfVersion.mockResolvedValue(vault(6));

    const res = await useCase.execute('u1', 'tasks', dto({ baseVersion: 5 }));

    expect(res).toEqual({ version: 6 });
    expect(repo.replaceIfVersion).toHaveBeenCalledWith(
      'u1',
      'tasks',
      expect.any(Object),
      5,
    );
  });

  it('409 with the real currentVersion when another device wrote first', async () => {
    repo.replaceIfVersion.mockResolvedValue(null);
    repo.findByUserAndScope.mockResolvedValue(vault(7));

    const err = await useCase
      .execute('u1', 'tasks', dto({ baseVersion: 5 }))
      .catch((e) => e);

    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({
      error: 'VERSION_CONFLICT',
      currentVersion: 7,
    });
  });

  it('404 when baseVersion is sent but the vault was deleted', async () => {
    repo.replaceIfVersion.mockResolvedValue(null);
    repo.findByUserAndScope.mockResolvedValue(null);

    await expect(
      useCase.execute('u1', 'tasks', dto({ baseVersion: 5 })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('413 when the ciphertext exceeds the 64KB cap, without touching the repo', async () => {
    const oversized = 'A'.repeat(MAX_CIPHERTEXT_B64_LENGTH + 4);

    await expect(
      useCase.execute('u1', 'tasks', dto({ ciphertext: oversized })),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.replaceIfVersion).not.toHaveBeenCalled();
  });
});
