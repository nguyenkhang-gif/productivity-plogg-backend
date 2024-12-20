export interface EpubInfo {
  author: string;
  title: string;
  thumbnails: string; // Lưu ý sửa lại 'thumnails' thành 'thumbnails' nếu đó là lỗi chính tả
  chapters: object[];
}
