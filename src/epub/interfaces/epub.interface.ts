import { Types } from 'mongoose';

export interface IEpub {
  status?: {
    visibility?: 'public' | 'private' | 'friends'; // Enum cho phép 3 giá trị này
    likes?: number; // Số lượt thích mặc định là 0
  };
  epubInfo?: {
    author?: string; // Tên tác giả, bắt buộc
    title?: string; // Tiêu đề của tài liệu, bắt buộc
    thumbnails?: string; // Đường dẫn tới ảnh thumbnail, bắt buộc
    chapters?: string[]; // Mảng các chương, bắt buộc
  };
  properties?: Record<string, any>; // Các thuộc tính bổ sung dưới dạng key-value
  userId?: Types.ObjectId; // ID của người dùng tạo ra tài liệu
}
