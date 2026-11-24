import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  CLOUDINARY_STORAGE,
  CloudinaryFolder,
  CloudinaryPaginatedFiles,
  CloudinaryStorageRepository,
} from 'src/core/domain/repositories/cloudinary-storage.repository.interface';

@Injectable()
export class UploadCloudinaryUseCase {
  constructor(
    @Inject(CLOUDINARY_STORAGE)
    private readonly cloudinaryRepo: CloudinaryStorageRepository,
  ) {}

  async upload(
    file: Express.Multer.File,
    userId: string,
    folder: CloudinaryFolder = 'uploads',
  ): Promise<string> {
    return this.cloudinaryRepo.upload(file, userId, folder);
  }

  async listFiles(
    userId: string,
    folder: CloudinaryFolder,
    page = 1,
    limit = 20,
  ): Promise<CloudinaryPaginatedFiles> {
    return this.cloudinaryRepo.listFiles(userId, folder, page, limit);
  }

  async deleteFile(
    publicId: string,
    userId: string,
    role?: string,
  ): Promise<void> {
    if (role !== 'admin') {
      const owned =
        !publicId.split('/').includes('..') &&
        (publicId.startsWith(`uploads/${userId}/`) ||
          publicId.startsWith(`icons/${userId}/`));
      if (!userId || !owned) {
        throw new ForbiddenException('You cannot delete this file');
      }
    }
    return this.cloudinaryRepo.deleteFile(publicId);
  }
}
