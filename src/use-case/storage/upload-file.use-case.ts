import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE, FileStorageRepository, PaginatedFiles, StorageBucket } from 'src/core/domain/repositories/file-storage.repository.interface';

@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject(FILE_STORAGE) private readonly storageRepo: FileStorageRepository,
  ) {}

  async execute(file: Express.Multer.File, userId: string, bucket: StorageBucket = 'upload'): Promise<string> {
    return this.storageRepo.upload(file, userId, bucket);
  }

  async listFiles(userId: string, bucket: StorageBucket, page = 1, limit = 20): Promise<PaginatedFiles> {
    return this.storageRepo.listFiles(userId, bucket, page, limit);
  }
}
