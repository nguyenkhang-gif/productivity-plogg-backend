export interface PostAuthor {
  id: string;
  fullName: string;
  username: string;
  profilePic?: string;
}

export class Post {
  id: string;
  authorId: string;
  content: string;
  imageUrls?: string[];
  likesCount: number;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  author?: PostAuthor;
  commentCount?: number;

  constructor(partial: Partial<Post>) {
    Object.assign(this, partial);
  }
}
