export const FILE_STORAGE = 'FILE_STORAGE';

export type StorageBucket = 'upload' | 'icons';

export interface FileItem {
  name: string;
  publicUrl: string;
  size: number;
  createdAt: string;
}

export interface PaginatedFiles {
  items: FileItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FileStorageRepository {
  upload(file: Express.Multer.File, userId: string, bucket?: StorageBucket): Promise<string>;
  listFiles(userId: string, bucket: StorageBucket, page: number, limit: number): Promise<PaginatedFiles>;
  deleteFile(fileName: string, userId: string, bucket: StorageBucket): Promise<void>;
}
