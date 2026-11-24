import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import {
  VaultPayload,
  VaultRepository,
  VaultScope,
} from 'src/modules/productivity/vault/domain/vault.repository.interface';
import {
  Vault as VaultEntity,
  VaultKdf,
} from 'src/modules/productivity/vault/domain/vault.entity';

type VaultRow = Prisma.EncryptedVaultGetPayload<object>;

/** Payload columns are opaque base64: never log rows or payloads. */
@Injectable()
export class PrismaVaultRepository implements VaultRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: VaultRow): VaultEntity {
    return new VaultEntity({
      id: row.id,
      userId: row.userId,
      scope: row.scope,
      ciphertext: row.ciphertext,
      iv: row.iv,
      wrappedKey: row.wrappedKey,
      kdf: row.kdf as unknown as VaultKdf,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findByUserAndScope(
    userId: string,
    scope: VaultScope,
  ): Promise<VaultEntity | null> {
    const row = await this.prisma.encryptedVault.findUnique({
      where: { userId_scope: { userId, scope } },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async create(
    userId: string,
    scope: VaultScope,
    payload: VaultPayload,
  ): Promise<VaultEntity | null> {
    try {
      const row = await this.prisma.encryptedVault.create({
        data: {
          id: newObjectId(),
          userId,
          scope,
          ...payload,
          kdf: payload.kdf as unknown as Prisma.InputJsonValue,
          version: 1,
        },
      });
      return this.mapToDomain(row);
    } catch (err: any) {
      if (err?.code === 'P2002') return null; // vault already exists
      throw err;
    }
  }

  /**
   * Compare-and-swap: `updateMany where { version }` matches zero rows when
   * another writer got there first. The follow-up read runs in the same
   * transaction, so it sees our own row (locked until commit) and returns the
   * version this write produced.
   */
  async replaceIfVersion(
    userId: string,
    scope: VaultScope,
    payload: VaultPayload,
    baseVersion: number,
  ): Promise<VaultEntity | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.encryptedVault.updateMany({
        where: { userId, scope, version: baseVersion },
        data: {
          ...payload,
          kdf: payload.kdf as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      if (count === 0) return null;
      const row = await tx.encryptedVault.findUniqueOrThrow({
        where: { userId_scope: { userId, scope } },
      });
      return this.mapToDomain(row);
    });
  }

  async delete(userId: string, scope: VaultScope): Promise<boolean> {
    const { count } = await this.prisma.encryptedVault.deleteMany({
      where: { userId, scope },
    });
    return count > 0;
  }
}
