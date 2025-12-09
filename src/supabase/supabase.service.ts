import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    mimetype: string,
  ) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: mimetype,
        upsert: false,
      });
    if (error) throw new Error(error.message);
    return data;
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async listUserFiles(bucket: string, folder: string) {
    const { data, error } = await this.client.storage.from(bucket).list(folder);

    if (error) throw new Error(error.message);

    return data; // Mảng các object { name, id, updated_at, metadata, ... }
  }

  async getFileInfo(bucket: string, filePath: string) {
    // list() cần truyền vào folder path. Để lấy 1 file cụ thể, truyền path chứa file.
    const folder = filePath.substring(0, filePath.lastIndexOf('/')) || '';
    const fileName = filePath.split('/').pop();

    const { data, error } = await this.client.storage
      .from(bucket)
      .list(folder, {
        search: fileName, // filter theo tên file
      });
    if (error) throw new Error(error.message);

    // data là mảng các file/folder trong folder -> tìm đúng file
    const file = data.find((f) => f.name === fileName);
    if (!file) throw new Error('File not found');
    return file; // { name, id, updated_at, created_at, last_accessed_at, metadata, ... }
  }
}
