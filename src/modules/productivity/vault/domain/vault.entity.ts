export interface VaultKdf {
  algo: string;
  salt: string;
  iterations: number;
}

/**
 * Zero-knowledge encrypted blob. The server never sees plaintext, keys,
 * or the user's PIN — only opaque base64 payloads produced client-side.
 */
export class Vault {
  id: string;
  userId: string;
  scope: string;
  /** Base64 AES-256-GCM output of the whole task list. */
  ciphertext: string;
  /** Base64, 12 bytes — fresh per encryption. */
  iv: string;
  /** Data key wrapped by the PIN-derived key encryption key. */
  wrappedKey: string;
  kdf: VaultKdf;
  /** Increments by 1 on every successful PUT (optimistic concurrency). */
  version: number;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<Vault>) {
    Object.assign(this, partial);
  }
}
