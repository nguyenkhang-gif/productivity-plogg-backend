export interface PostAuthor {
  id: string;
  fullName: string;
  username: string;
  profilePic?: string;
}

export interface UserReaction {
  type: string;
  icon?: string;
}

export class Post {
  id: string;
  authorId: string;
  content: string;
  imageUrls?: string[];
  reactCount: number;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  author?: PostAuthor;
  commentCount?: number;
  userReaction?: UserReaction | null;

  constructor(partial: Partial<Post>) {
    Object.assign(this, partial);
  }
}
