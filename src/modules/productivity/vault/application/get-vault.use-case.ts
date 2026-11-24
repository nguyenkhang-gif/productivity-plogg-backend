import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  VAULT_REPOSITORY,
  VaultRepository,
  VaultScope,
} from 'src/modules/productivity/vault/domain/vault.repository.interface';
import { Vault } from 'src/modules/productivity/vault/domain/vault.entity';

@Injectable()
export class GetVaultUseCase {
  constructor(
    @Inject(VAULT_REPOSITORY)
    private readonly vaultRepo: VaultRepository,
  ) {}

  async execute(userId: string, scope: VaultScope): Promise<Vault> {
    const vault = await this.vaultRepo.findByUserAndScope(userId, scope);
    if (!vault) throw new NotFoundException('Vault not found');
    return vault;
  }
}
