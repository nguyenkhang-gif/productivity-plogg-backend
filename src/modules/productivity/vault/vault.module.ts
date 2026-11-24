import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EncryptedVault,
  EncryptedVaultSchema,
} from 'src/modules/productivity/vault/infrastructure/encrypted-vault.schema';
import { MongoVaultRepository } from 'src/modules/productivity/vault/infrastructure/vault.repository';
import { VAULT_REPOSITORY } from 'src/modules/productivity/vault/domain/vault.repository.interface';
import { VaultController } from 'src/modules/productivity/vault/presentation/vault.controller';
import { GetVaultUseCase } from 'src/modules/productivity/vault/application/get-vault.use-case';
import { PutVaultUseCase } from 'src/modules/productivity/vault/application/put-vault.use-case';
import { DeleteVaultUseCase } from 'src/modules/productivity/vault/application/delete-vault.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EncryptedVault.name, schema: EncryptedVaultSchema },
    ]),
  ],
  controllers: [VaultController],
  providers: [
    {
      provide: VAULT_REPOSITORY,
      useClass: MongoVaultRepository,
    },
    GetVaultUseCase,
    PutVaultUseCase,
    DeleteVaultUseCase,
  ],
})
export class VaultModule {}
