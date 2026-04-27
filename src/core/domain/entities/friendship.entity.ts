export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export class Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<Friendship>) {
    Object.assign(this, partial);
  }
}
