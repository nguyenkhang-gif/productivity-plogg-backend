import { ObjectId } from 'bson';
import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { CollectionMigrator } from '../migrator';
import {
  nonEmptyString,
  skipMissingUsers,
  toDate,
  toHexId,
  toInt,
} from './user-progress.orphans';

export type VaultRow = Prisma.EncryptedVaultUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The payload (ciphertext, iv, wrappedKey, kdf) is opaque and copied
 * byte-for-byte; it is never logged and never mentioned in skip reasons.
 * Documents missing any payload field, or with a malformed kdf, are skipped
 * rather than half-migrated (the client could not decrypt them anyway).
 */
export function transformVault(doc: Record<string, any>): VaultRow | null {
  const id = toHexId(doc._id);
  const userId = toHexId(doc.userId);
  const scope = nonEmptyString(doc.scope);
  const ciphertext = nonEmptyString(doc.ciphertext);
  const iv = nonEmptyString(doc.iv);
  const wrappedKey = nonEmptyString(doc.wrappedKey);
  const kdf = doc.kdf;
  if (!id || !userId || !scope || !ciphertext || !iv || !wrappedKey) {
    return null;
  }
  if (
    !kdf ||
    typeof kdf !== 'object' ||
    Array.isArray(kdf) ||
    typeof kdf.algo !== 'string' ||
    typeof kdf.salt !== 'string' ||
    typeof kdf.iterations !== 'number'
  ) {
    return null;
  }

  const version = toInt(doc.version);
  const createdAt = toDate(doc.createdAt) ?? new ObjectId(id).getTimestamp();
  const updatedAt = toDate(doc.updatedAt) ?? createdAt;

  return {
    id,
    userId,
    scope,
    ciphertext,
    iv,
    wrappedKey,
    kdf: { algo: kdf.algo, salt: kdf.salt, iterations: kdf.iterations },
    version: version !== null && version >= 1 ? version : 1,
    createdAt,
    updatedAt,
  };
}

export const vaultMigrator: CollectionMigrator<
  Record<string, any>,
  VaultRow
> = {
  name: 'encrypted-vaults',
  collection: 'encrypted_vaults',
  dependsOn: ['users'],
  transform: transformVault,
  filterBatch: (prisma, rows) =>
    skipMissingUsers(prisma, rows, 'encrypted_vaults'),
  async upsertBatch(prisma: PrismaClient, rows: VaultRow[]) {
    await prisma.$transaction(
      rows.map((row) => {
        const { id, ...data } = row;
        return prisma.encryptedVault.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }),
    );
  },
  countTarget: (prisma) => prisma.encryptedVault.count(),
};
