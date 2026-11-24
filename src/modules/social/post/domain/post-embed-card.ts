export interface PostEmbedCard {
  id: string;
  title: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  authorName: string | null;
  authorAvatar: string | null;
  createdAt: Date | null;
}
