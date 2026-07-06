import { Vault, VaultKdf } from '../entities/vault.entity';

export const VAULT_REPOSITORY = 'VAULT_REPOSITORY';

export type VaultScope = 'tasks';

export interface VaultPayload {
  ciphertext: string;
  iv: string;
  wrappedKey: string;
  kdf: VaultKdf;
}

export interface VaultRepository {
  findByUserAndScope(userId: string, scope: VaultScope): Promise<Vault | null>;
  /** Creates the vault at version 1. Returns null if one already exists. */
  create(
    userId: string,
    scope: VaultScope,
    payload: VaultPayload,
  ): Promise<Vault | null>;
  /**
   * Atomic compare-and-swap: replaces the blob and increments version only
   * if the stored version equals baseVersion. Returns null on mismatch.
   */
  replaceIfVersion(
    userId: string,
    scope: VaultScope,
    payload: VaultPayload,
    baseVersion: number,
  ): Promise<Vault | null>;
  delete(userId: string, scope: VaultScope): Promise<boolean>;
}
