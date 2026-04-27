import { Friendship, FriendshipStatus } from '../entities/friendship.entity';

export const FRIENDSHIP_REPOSITORY = 'FRIENDSHIP_REPOSITORY';

export interface FriendshipRepository {
  findById(id: string): Promise<Friendship | null>;
  findByPair(userId: string, friendId: string): Promise<Friendship | null>;
  findFriends(userId: string): Promise<Friendship[]>;
  findPendingReceived(userId: string): Promise<Friendship[]>;
  findPendingSent(userId: string): Promise<Friendship[]>;
  create(friendship: Friendship): Promise<Friendship>;
  updateStatus(id: string, status: FriendshipStatus): Promise<Friendship>;
  delete(id: string): Promise<void>;
}
