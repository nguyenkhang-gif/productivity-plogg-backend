export const CLOUDINARY_STORAGE = 'CLOUDINARY_STORAGE';

export type CloudinaryFolder = 'uploads' | 'icons';

export interface CloudinaryFileItem {
  publicId: string;
  url: string;
  format: string;
  size: number;
  createdAt: string;
}

export interface CloudinaryPaginatedFiles {
  items: CloudinaryFileItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CloudinaryStorageRepository {
  upload(
    file: Express.Multer.File,
    userId: string,
    folder?: CloudinaryFolder,
  ): Promise<string>;
  listFiles(
    userId: string,
    folder: CloudinaryFolder,
    page: number,
    limit: number,
  ): Promise<CloudinaryPaginatedFiles>;
  deleteFile(publicId: string): Promise<void>;
}
