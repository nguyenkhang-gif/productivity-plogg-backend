import { Comment } from '../entities/comment.entity';

export const COMMENT_REPOSITORY = 'COMMENT_REPOSITORY';

export interface PaginatedComments {
  items: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CommentRepository {
  findById(id: string): Promise<Comment | null>;
  findByPost(postId: string, page: number, limit: number): Promise<PaginatedComments>;
  create(comment: Comment): Promise<Comment>;
  update(id: string, content: string): Promise<Comment>;
  delete(id: string): Promise<void>;
}
