import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  VAULT_REPOSITORY,
  VaultRepository,
  VaultScope,
} from 'src/core/domain/repositories/vault.repository.interface';
import { PutVaultDto } from 'src/core/dtos/vault.dto';

/** 64KB of binary ciphertext, measured on its base64 encoding (+padding). */
export const MAX_CIPHERTEXT_B64_LENGTH = Math.ceil((64 * 1024) / 3) * 4;

export interface PutVaultResult {
  version: number;
}

@Injectable()
export class PutVaultUseCase {
  constructor(
    @Inject(VAULT_REPOSITORY)
    private readonly vaultRepo: VaultRepository,
  ) {}

  async execute(
    userId: string,
    scope: VaultScope,
    dto: PutVaultDto,
  ): Promise<PutVaultResult> {
    if (dto.ciphertext.length > MAX_CIPHERTEXT_B64_LENGTH) {
      throw new PayloadTooLargeException('Vault blob exceeds the 64KB limit');
    }

    const payload = {
      ciphertext: dto.ciphertext,
      iv: dto.iv,
      wrappedKey: dto.wrappedKey,
      kdf: dto.kdf,
    };

    if (dto.baseVersion === undefined) {
      const created = await this.vaultRepo.create(userId, scope, payload);
      if (created) return { version: created.version };
      // A vault already exists — client must send baseVersion to overwrite.
      const current = await this.vaultRepo.findByUserAndScope(userId, scope);
      throw new ConflictException({
        error: 'VERSION_CONFLICT',
        message: 'Vault already exists; send baseVersion to update',
        currentVersion: current?.version ?? null,
      });
    }

    const updated = await this.vaultRepo.replaceIfVersion(
      userId,
      scope,
      payload,
      dto.baseVersion,
    );
    if (updated) return { version: updated.version };

    // CAS failed: either another device wrote first, or the vault is gone.
    const current = await this.vaultRepo.findByUserAndScope(userId, scope);
    if (!current) throw new NotFoundException('Vault not found');
    throw new ConflictException({
      error: 'VERSION_CONFLICT',
      message: 'Vault was modified by another device; pull, merge and retry',
      currentVersion: current.version,
    });
  }
}
