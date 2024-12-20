import { IsOptional } from 'class-validator';
// import { Types } from 'mongoose';

export class CreateEpubDto {
  @IsOptional()
  status?: {
    visibility?: 'public' | 'private' | 'friends'; // Quyền xem của tài liệu
    likes?: number; // Số lượt thích, mặc định là 0
  } = {
    visibility: 'private',
    likes: 0,
  };

  @IsOptional()
  epubInfo: {
    author: string; // Tên tác giả, bắt buộc
    title: string; // Tiêu đề của tài liệu, bắt buộc
    thumbnails: string; // Đường dẫn tới ảnh thumbnail, bắt buộc
    chapters: string[]; // Mảng các chương, bắt buộc
  };
}
