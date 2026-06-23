import { Inject, Injectable } from '@nestjs/common';
import { LOCAL_STORAGE, LocalBucket, LocalPaginatedFiles, LocalStorageRepository } from 'src/core/domain/repositories/local-storage.repository.interface';

@Injectable()
export class UploadLocalUseCase {
  constructor(
    @Inject(LOCAL_STORAGE) private readonly storage: LocalStorageRepository,
  ) {}

  async execute(file: Express.Multer.File, userId: string, bucket: LocalBucket = 'upload'): Promise<string> {
    return this.storage.upload(file, userId, bucket);
  }

  async listFiles(userId: string, bucket: LocalBucket, page = 1, limit = 20, subPath = ''): Promise<LocalPaginatedFiles> {
    return this.storage.listFiles(userId, bucket, page, limit, subPath);
  }

  async deleteFile(fileName: string, userId: string, bucket: LocalBucket): Promise<void> {
    return this.storage.deleteFile(fileName, userId, bucket);
  }
}
