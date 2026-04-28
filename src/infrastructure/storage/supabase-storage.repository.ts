import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FileItem, FileStorageRepository, PaginatedFiles, StorageBucket } from 'src/core/domain/repositories/file-storage.repository.interface';

@Injectable()
export class SupabaseStorageRepository implements FileStorageRepository {
  private client: SupabaseClient;
  private bucket = process.env.SUPABASE_BUCKET_NAME!;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }

  async upload(file: Express.Multer.File, userId: string, bucket: StorageBucket = 'upload'): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) throw new Error(error.message);

    return this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async listFiles(userId: string, bucket: StorageBucket, page: number, limit: number): Promise<PaginatedFiles> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .list(userId, { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) throw new Error(error.message);

    const all = data ?? [];
    const total = all.length;
    const offset = (page - 1) * limit;
    const paged = all.slice(offset, offset + limit);

    const items: FileItem[] = paged.map((f) => ({
      name: f.name,
      publicUrl: this.client.storage.from(bucket).getPublicUrl(`${userId}/${f.name}`).data.publicUrl,
      size: f.metadata?.size ?? 0,
      createdAt: f.created_at,
    }));

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
