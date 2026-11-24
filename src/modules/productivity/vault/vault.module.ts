import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EncryptedVault,
  EncryptedVaultSchema,
} from 'src/modules/productivity/vault/infrastructure/encrypted-vault.schema';
import { PrismaModule } from 'src/shared/database/prisma.module';
import { backendProvider } from 'src/shared/database/backend-provider';
import { PrismaVaultRepository } from 'src/modules/productivity/vault/infrastructure/vault.prisma.repository';
import { MongoVaultRepository } from 'src/modules/productivity/vault/infrastructure/vault.repository';
import {
  VAULT_REPOSITORY,
  type VaultRepository,
} from 'src/modules/productivity/vault/domain/vault.repository.interface';
import { VaultController } from 'src/modules/productivity/vault/presentation/vault.controller';
import { GetVaultUseCase } from 'src/modules/productivity/vault/application/get-vault.use-case';
import { PutVaultUseCase } from 'src/modules/productivity/vault/application/put-vault.use-case';
import { DeleteVaultUseCase } from 'src/modules/productivity/vault/application/delete-vault.use-case';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: EncryptedVault.name, schema: EncryptedVaultSchema },
    ]),
  ],
  controllers: [VaultController],
  providers: [
    MongoVaultRepository,
    PrismaVaultRepository,
    backendProvider<VaultRepository>(
      VAULT_REPOSITORY,
      MongoVaultRepository,
      PrismaVaultRepository,
    ),
    GetVaultUseCase,
    PutVaultUseCase,
    DeleteVaultUseCase,
  ],
})
export class VaultModule {}
