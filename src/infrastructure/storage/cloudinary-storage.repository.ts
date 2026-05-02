import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryFileItem, CloudinaryFolder, CloudinaryPaginatedFiles, CloudinaryStorageRepository as ICloudinaryStorageRepository } from 'src/core/domain/repositories/cloudinary-storage.repository.interface';

@Injectable()
export class CloudinaryStorageRepository implements ICloudinaryStorageRepository {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(file: Express.Multer.File, userId: string, folder: CloudinaryFolder = 'uploads'): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `${folder}/${userId}`, resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(new Error(error.message));
          resolve(result.secure_url);
        },
      ).end(file.buffer);
    });
  }

  async listFiles(userId: string, folder: CloudinaryFolder, page: number, limit: number): Promise<CloudinaryPaginatedFiles> {
    const result = await cloudinary.search
      .expression(`folder:${folder}/${userId}`)
      .sort_by('created_at', 'desc')
      .max_results(500)
      .execute();

    const all: CloudinaryFileItem[] = (result.resources ?? []).map((r: any) => ({
      publicId: r.public_id,
      url: r.secure_url,
      format: r.format,
      size: r.bytes,
      createdAt: r.created_at,
    }));

    const total = all.length;
    const offset = (page - 1) * limit;
    const items = all.slice(offset, offset + limit);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteFile(publicId: string): Promise<void> {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== 'ok') throw new Error(`Failed to delete: ${publicId}`);
  }
}
