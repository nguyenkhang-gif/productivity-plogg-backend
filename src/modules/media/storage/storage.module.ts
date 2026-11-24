import { Module } from '@nestjs/common';
import { FILE_STORAGE } from 'src/modules/media/storage/domain/file-storage.repository.interface';
import { CLOUDINARY_STORAGE } from 'src/modules/media/storage/domain/cloudinary-storage.repository.interface';
import { LOCAL_STORAGE } from 'src/modules/media/storage/domain/local-storage.repository.interface';
import { SupabaseStorageRepository } from './infrastructure/supabase-storage.repository';
import { CloudinaryStorageRepository } from './infrastructure/cloudinary-storage.repository';
import { LocalStorageRepositoryImpl } from './infrastructure/local-storage.repository';
import { UploadFileUseCase } from 'src/modules/media/storage/application/upload-file.use-case';
import { UploadCloudinaryUseCase } from 'src/modules/media/storage/application/upload-cloudinary.use-case';
import { UploadLocalUseCase } from 'src/modules/media/storage/application/upload-local.use-case';
import { UploadController } from 'src/modules/media/storage/presentation/upload.controller';
import { UploadCloudinaryController } from 'src/modules/media/storage/presentation/upload-cloudinary.controller';
import { UploadLocalController } from 'src/modules/media/storage/presentation/upload-local.controller';

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
