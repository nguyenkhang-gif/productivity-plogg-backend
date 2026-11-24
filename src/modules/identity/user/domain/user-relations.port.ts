export const USER_RELATIONS = 'USER_RELATIONS';

/**
 * Reads owned by other modules (friendships, posts) that user queries need.
 * Backed by Mongo until those modules move to Postgres.
 */
export interface UserRelations {
  friendIdsOf(userId: string): Promise<string[]>;
  postCountsByAuthor(authorIds: string[]): Promise<Map<string, number>>;
}
