export const BOOKMARK_REPOSITORY = 'BOOKMARK_REPOSITORY';

export interface BookmarkRepository {
  upsert(userId: string, postId: string): Promise<void>;
  delete(userId: string, postId: string): Promise<void>;
  countByUser(userId: string): Promise<number>;
  getBookmarkedPostIds(userId: string, postIds: string[]): Promise<Set<string>>;
}
