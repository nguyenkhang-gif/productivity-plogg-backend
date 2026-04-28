import { Module } from '@nestjs/common';
import { FILE_STORAGE } from 'src/core/domain/repositories/file-storage.repository.interface';
import { SupabaseStorageRepository } from './supabase-storage.repository';
import { UploadFileUseCase } from 'src/use-case/storage/upload-file.use-case';
import { UploadController } from 'src/presentation/controllers/upload.controller';

@Module({
  providers: [
    { provide: FILE_STORAGE, useClass: SupabaseStorageRepository },
    UploadFileUseCase,
  ],
  controllers: [UploadController],
})
export class StorageModule {}
