export type EmbedProvider = 'INTERNAL_POST' | 'YOUTUBE' | 'GENERIC';

export interface PostEmbedCard {
  id: string;
  title: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  authorName: string | null;
  authorAvatar: string | null;
  createdAt: Date | null;
}

export class MessageEmbed {
  id: string;
  url: string;
  provider: EmbedProvider;
  refId?: string | null;

  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  siteName?: string | null;
  authorName?: string | null;
  embedUrl?: string | null;
  position: number;

  /**
   * Chỉ có với INTERNAL_POST. Populate runtime theo quyền người đọc — không lưu DB.
   * null = post đã xoá HOẶC không có quyền (cố ý không phân biệt).
   */
  resolved?: PostEmbedCard | null;

  constructor(partial: Partial<MessageEmbed>) {
    Object.assign(this, partial);
  }
}
