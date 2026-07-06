import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VaultPayload,
  VaultRepository,
  VaultScope,
} from 'src/core/domain/repositories/vault.repository.interface';
import { Vault as VaultEntity } from 'src/core/domain/entities/vault.entity';
import {
  EncryptedVault,
  EncryptedVaultDocument,
} from '../schemas/encrypted-vault.schema';

@Injectable()
export class MongoVaultRepository implements VaultRepository {
  constructor(
    @InjectModel(EncryptedVault.name)
    private readonly model: Model<EncryptedVaultDocument>,
  ) {}

  private mapToDomain(doc: any): VaultEntity {
    return new VaultEntity({
      id: doc._id.toString(),
      userId: doc.userId,
      scope: doc.scope,
      ciphertext: doc.ciphertext,
      iv: doc.iv,
      wrappedKey: doc.wrappedKey,
      kdf: doc.kdf,
      version: doc.version,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findByUserAndScope(
    userId: string,
    scope: VaultScope,
  ): Promise<VaultEntity | null> {
    const doc = await this.model.findOne({ userId, scope }).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async create(
    userId: string,
    scope: VaultScope,
    payload: VaultPayload,
  ): Promise<VaultEntity | null> {
    try {
      const doc = await this.model.create({
        userId,
        scope,
        ...payload,
        version: 1,
      });
      return this.mapToDomain(doc);
    } catch (err: any) {
      const code = err?.code ?? err?.cause?.code;
      if (code === 11000) return null; // vault already exists
      throw err;
    }
  }

  async replaceIfVersion(
    userId: string,
    scope: VaultScope,
    payload: VaultPayload,
    baseVersion: number,
  ): Promise<VaultEntity | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { userId, scope, version: baseVersion },
        { $set: { ...payload }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async delete(userId: string, scope: VaultScope): Promise<boolean> {
    const res = await this.model.deleteOne({ userId, scope }).exec();
    return res.deletedCount > 0;
  }
}
