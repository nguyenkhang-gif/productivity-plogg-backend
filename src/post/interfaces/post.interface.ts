import { Types } from 'mongoose';

export interface IPostNew {
  imgurl?: string[];
  caption?: string;
  comments?: Types.ObjectId[];
  status?: {
    visibility: 'public' | 'private' | 'friends';
    likes: number;
  };
  properties?: object;
}

export interface IPost {
  readonly userid: Types.ObjectId; // Bắt buộc, ID của người dùng
  readonly imgurl?: string[]; // Không bắt buộc, mảng các URL hình ảnh
  readonly caption?: string; // Không bắt buộc, chú thích của bài viết
  readonly comments?: Types.ObjectId[]; // Không bắt buộc, mảng các ID bình luận
  readonly status?: {
    readonly visibility?: 'public' | 'private' | 'friends'; // Không bắt buộc, trạng thái hiển thị
    readonly likes?: number; // Không bắt buộc, số lượt thích
  };
  readonly properties?: object; // Không bắt buộc, các thuộc tính khác
}
