import { PostAuthor } from './post.entity';

export class Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  iconUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  author?: PostAuthor;

  constructor(partial: Partial<Comment>) {
    Object.assign(this, partial);
  }
}

