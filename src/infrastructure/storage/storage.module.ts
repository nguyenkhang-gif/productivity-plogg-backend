import { Module } from '@nestjs/common';
import { FILE_STORAGE } from 'src/core/domain/repositories/file-storage.repository.interface';
import { CLOUDINARY_STORAGE } from 'src/core/domain/repositories/cloudinary-storage.repository.interface';
import { LOCAL_STORAGE } from 'src/core/domain/repositories/local-storage.repository.interface';
import { SupabaseStorageRepository } from './supabase-storage.repository';
import { CloudinaryStorageRepository } from './cloudinary-storage.repository';
import { LocalStorageRepositoryImpl } from './local-storage.repository';
import { UploadFileUseCase } from 'src/use-case/storage/upload-file.use-case';
import { UploadCloudinaryUseCase } from 'src/use-case/storage/upload-cloudinary.use-case';
import { UploadLocalUseCase } from 'src/use-case/storage/upload-local.use-case';
import { UploadController } from 'src/presentation/controllers/upload.controller';
import { UploadCloudinaryController } from 'src/presentation/controllers/upload-cloudinary.controller';
import { UploadLocalController } from 'src/presentation/controllers/upload-local.controller';

@Module({
  providers: [
    { provide: FILE_STORAGE, useClass: SupabaseStorageRepository },
    { provide: CLOUDINARY_STORAGE, useClass: CloudinaryStorageRepository },
    { provide: LOCAL_STORAGE, useClass: LocalStorageRepositoryImpl },
    UploadFileUseCase,
    UploadCloudinaryUseCase,
    UploadLocalUseCase,
  ],
  controllers: [
    UploadController,
    UploadCloudinaryController,
    UploadLocalController,
  ],
})
export class StorageModule {}
