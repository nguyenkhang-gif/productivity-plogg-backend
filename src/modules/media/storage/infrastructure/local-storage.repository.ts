import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  LocalBucket,
  LocalFileItem,
  LocalPaginatedFiles,
  LocalStorageRepository,
} from 'src/modules/media/storage/domain/local-storage.repository.interface';
import { requireImageType } from 'src/shared/http/file-type';

const PRIMARY_STORAGE = process.env.LOCAL_STORAGE_PATH ?? '/app/storage';
const FALLBACK_STORAGE = '/tmp/plog-storage';
const PUBLIC_BASE_URL =
  process.env.LOCAL_STORAGE_PUBLIC_URL ?? 'https://knn-api-be.xyz/files';

export async function resolveStorageRoot(): Promise<string> {
  try {
    await fs.access(PRIMARY_STORAGE);
    return PRIMARY_STORAGE;
  } catch {
    return FALLBACK_STORAGE;
  }
}

@Injectable()
export class LocalStorageRepositoryImpl implements LocalStorageRepository {
  private async dir(bucket: LocalBucket, userId: string): Promise<string> {
    const root = await resolveStorageRoot();
    return path.join(root, bucket, userId);
  }

  async upload(
    file: Express.Multer.File,
    userId: string,
    bucket: LocalBucket,
  ): Promise<string> {
    const detected = requireImageType(file);
    const dir = await this.dir(bucket, userId);
    await fs.mkdir(dir, { recursive: true });

    const fileName = `${Date.now()}.${detected.ext}`;
    await fs.writeFile(path.join(dir, fileName), file.buffer);

    return `${PUBLIC_BASE_URL}/${bucket}/${userId}/${fileName}`;
  }

  async listFiles(
    userId: string,
    bucket: LocalBucket,
    page: number,
    limit: number,
    subPath = '',
  ): Promise<LocalPaginatedFiles> {
    const base = await this.dir(bucket, userId);

    // Sanitize subPath — strip leading slashes và block path traversal
    const safeSub = subPath
      .split('/')
      .filter((seg) => seg && seg !== '..' && seg !== '.')
      .join('/');

    const dir = safeSub ? path.join(base, safeSub) : base;

    // Ensure dir is still inside base (double-check)
    if (dir !== base && !dir.startsWith(base + path.sep))
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };

    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    entries.sort((a, b) => a.localeCompare(b));

    const total = entries.length;
    const offset = (page - 1) * limit;
    const paged = entries.slice(offset, offset + limit);

    const urlSubPath = safeSub ? `/${safeSub}` : '';

    const items: LocalFileItem[] = await Promise.all(
      paged.map(async (name) => {
        const stat = await fs.stat(path.join(dir, name));
        const isDir = stat.isDirectory();
        return {
          name,
          type: isDir ? 'directory' : 'file',
          publicUrl: isDir
            ? null
            : `${PUBLIC_BASE_URL}/${bucket}/${userId}${urlSubPath}/${name}`,
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

  async deleteFile(
    fileName: string,
    userId: string,
    bucket: LocalBucket,
  ): Promise<void> {
    const filePath = path.join(
      await this.dir(bucket, userId),
      path.basename(fileName),
    );
    await fs.unlink(filePath);
  }
}
