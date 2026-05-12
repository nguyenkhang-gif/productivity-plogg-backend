import { Post } from '../entities/post.entity';

export const POST_REPOSITORY = 'POST_REPOSITORY';

export interface PaginatedPosts {
  items: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PostRepository {
  findById(id: string, currentUserId?: string): Promise<Post | null>;
  findAll(page: number, limit: number, currentUserId: string): Promise<PaginatedPosts>;
  findByAuthor(authorId: string, page: number, limit: number, currentUserId: string): Promise<PaginatedPosts>;
  create(post: Post): Promise<Post>;
  update(id: string, post: Partial<Post>): Promise<Post>;
  delete(id: string): Promise<void>;
}
