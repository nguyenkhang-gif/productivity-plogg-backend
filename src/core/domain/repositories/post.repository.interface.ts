import { Post, PostModerationStatus } from '../entities/post.entity';

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
  sortByUpdatedAt?: 1 | -1;
}

export interface AdminPostFilter {
  search?: string;
  authorId?: string;
  moderationStatus?: string;
  visibility?: string;
  page: number;
  limit: number;
}

export interface PostStats {
  postCount: number;
  totalReactionsReceived: number;
  totalComments: number;
}

export interface PostRepository {
  findById(id: string, currentUserId?: string): Promise<Post | null>;
  // raw fetch without visibility/moderation enforcement (moderator/internal use)
  findByIdRaw(id: string): Promise<Post | null>;
  findAll(
    page: number,
    limit: number,
    currentUserId: string,
    filter?: PostFeedFilter,
  ): Promise<PaginatedPosts>;
  findByAuthor(
    authorId: string,
    page: number,
    limit: number,
    currentUserId: string,
  ): Promise<PaginatedPosts>;
  findTrending(limit: number, currentUserId: string): Promise<Post[]>;
  getStatsByAuthor(authorId: string): Promise<PostStats>;
  // moderation
  findPendingPublic(page: number, limit: number): Promise<PaginatedPosts>;
  setModerationStatus(
    id: string,
    status: PostModerationStatus,
    moderatorId: string,
    reason?: string | null,
  ): Promise<Post>;
  create(post: Post): Promise<Post>;
  update(
    id: string,
    post: Partial<Post>,
    currentUserId?: string,
  ): Promise<Post>;
  delete(id: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;
  nullifyCategoryOnPosts(categoryId: string): Promise<void>;
  countByAuthor(authorId: string): Promise<number>;
  findAllAdmin(filter: AdminPostFilter): Promise<PaginatedPosts>;
  // share
  findRepostByUser(
    originalPostId: string,
    userId: string,
  ): Promise<Post | null>;
  getShareCount(postId: string): Promise<number>;
  incrementShareCount(postId: string): Promise<void>;
  decrementShareCount(postId: string): Promise<void>;
}
