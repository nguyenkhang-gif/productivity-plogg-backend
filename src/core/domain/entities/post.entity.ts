export interface PostAuthor {
  id: string;
  fullName: string;
  username: string;
  profilePic?: string;
}

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
}

export interface PostTag {
  id: string;
  name: string;
  slug: string;
}

export interface UserReaction {
  type: string;
  icon?: string;
}

export class Post {
  id: string;
  authorId: string;
  title?: string;
  content: string;
  imageUrls?: string[];
  categoryId?: string | null;
  tagIds?: string[];
  viewCount?: number;
  reactCount: number;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  author?: PostAuthor;
  category?: PostCategory | null;
  tags?: PostTag[];
  isBookmarked?: boolean;
  commentCount?: number;
  userReaction?: UserReaction | null;

  constructor(partial: Partial<Post>) {
    Object.assign(this, partial);
  }
}
