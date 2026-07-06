import { Inject, Injectable } from '@nestjs/common';
import {
  VAULT_REPOSITORY,
  VaultRepository,
  VaultScope,
} from 'src/core/domain/repositories/vault.repository.interface';

@Injectable()
export class DeleteVaultUseCase {
  constructor(
    @Inject(VAULT_REPOSITORY)
    private readonly vaultRepo: VaultRepository,
  ) {}

  /** Idempotent: deleting a missing vault is not an error (forgot-PIN wipe). */
  async execute(
    userId: string,
    scope: VaultScope,
  ): Promise<{ deleted: boolean }> {
    const deleted = await this.vaultRepo.delete(userId, scope);
    return { deleted };
  }
}
