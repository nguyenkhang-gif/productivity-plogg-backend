import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EncryptedVault,
  EncryptedVaultSchema,
} from 'src/infrastructure/databases/schemas/encrypted-vault.schema';
import { MongoVaultRepository } from 'src/infrastructure/databases/repositories/vault.repository';
import { VAULT_REPOSITORY } from 'src/core/domain/repositories/vault.repository.interface';
import { VaultController } from 'src/presentation/controllers/vault.controller';
import { GetVaultUseCase } from 'src/use-case/vault/get-vault.use-case';
import { PutVaultUseCase } from 'src/use-case/vault/put-vault.use-case';
import { DeleteVaultUseCase } from 'src/use-case/vault/delete-vault.use-case';

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
