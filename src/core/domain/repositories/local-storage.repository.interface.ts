export const LOCAL_STORAGE = 'LOCAL_STORAGE';

export type LocalBucket = 'upload' | 'icons';

export interface LocalFileItem {
  name: string;
  publicUrl: string;
  size: number;
  createdAt: string;
}

export interface LocalPaginatedFiles {
  items: LocalFileItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LocalStorageRepository {
  upload(file: Express.Multer.File, userId: string, bucket: LocalBucket): Promise<string>;
  listFiles(userId: string, bucket: LocalBucket, page: number, limit: number): Promise<LocalPaginatedFiles>;
  deleteFile(fileName: string, userId: string, bucket: LocalBucket): Promise<void>;
}
