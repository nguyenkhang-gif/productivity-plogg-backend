import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { VaultKdf } from 'src/core/domain/entities/vault.entity';

export type EncryptedVaultDocument = EncryptedVault & Document;

// Blind-mailbox storage: every payload field is opaque base64 produced
// client-side. Never log document contents.
@Schema({ timestamps: true, collection: 'encrypted_vaults' })
export class EncryptedVault {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  scope: string;

  @Prop({ required: true })
  ciphertext: string;

  @Prop({ required: true })
  iv: string;

  @Prop({ required: true })
  wrappedKey: string;

  @Prop({ type: Object, required: true })
  kdf: VaultKdf;

  @Prop({ required: true, default: 1 })
  version: number;
}

export const EncryptedVaultSchema =
  SchemaFactory.createForClass(EncryptedVault);

EncryptedVaultSchema.index({ userId: 1, scope: 1 }, { unique: true });
