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

export interface PostFeedFilter {
  categoryId?: string;
  tags?: string[];
  excludeId?: string;
}

export interface PostStats {
  postCount: number;
  totalReactionsReceived: number;
  totalComments: number;
}

export interface PostRepository {
  findById(id: string, currentUserId?: string): Promise<Post | null>;
  findAll(page: number, limit: number, currentUserId: string, filter?: PostFeedFilter): Promise<PaginatedPosts>;
  findByAuthor(authorId: string, page: number, limit: number, currentUserId: string): Promise<PaginatedPosts>;
  findTrending(limit: number, currentUserId: string): Promise<Post[]>;
  getStatsByAuthor(authorId: string): Promise<PostStats>;
  create(post: Post): Promise<Post>;
  update(id: string, post: Partial<Post>): Promise<Post>;
  delete(id: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;
  nullifyCategoryOnPosts(categoryId: string): Promise<void>;
  countByAuthor(authorId: string): Promise<number>;
}
