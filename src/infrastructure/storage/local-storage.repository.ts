import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LocalBucket, LocalFileItem, LocalPaginatedFiles, LocalStorageRepository } from 'src/core/domain/repositories/local-storage.repository.interface';

const STORAGE_ROOT = process.env.LOCAL_STORAGE_PATH ?? '/app/storage';
const PUBLIC_BASE_URL = process.env.LOCAL_STORAGE_PUBLIC_URL ?? 'https://knn-api-be.xyz/files';

@Injectable()
export class LocalStorageRepositoryImpl implements LocalStorageRepository {
  private dir(bucket: LocalBucket, userId: string) {
    return path.join(STORAGE_ROOT, bucket, userId);
  }

  async upload(file: Express.Multer.File, userId: string, bucket: LocalBucket): Promise<string> {
    const dir = this.dir(bucket, userId);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname) || `.${file.mimetype.split('/')[1]}`;
    const filename = `${Date.now()}${ext}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);

    return `${PUBLIC_BASE_URL}/${bucket}/${userId}/${filename}`;
  }

  async listFiles(userId: string, bucket: LocalBucket, page: number, limit: number): Promise<LocalPaginatedFiles> {
    const dir = this.dir(bucket, userId);

    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      // Directory doesn't exist yet — return empty list
    }

    entries.sort((a, b) => b.localeCompare(a));

    const total = entries.length;
    const offset = (page - 1) * limit;
    const paged = entries.slice(offset, offset + limit);

    const items: LocalFileItem[] = await Promise.all(
      paged.map(async (name) => {
        const stat = await fs.stat(path.join(dir, name));
        return {
          name,
          publicUrl: `${PUBLIC_BASE_URL}/${bucket}/${userId}/${name}`,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
        };
      }),
    );

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteFile(fileName: string, userId: string, bucket: LocalBucket): Promise<void> {
    const filePath = path.join(this.dir(bucket, userId), fileName);
    await fs.unlink(filePath);
  }
}
