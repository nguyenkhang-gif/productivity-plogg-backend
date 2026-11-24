export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendInfo {
  id: string;
  fullName: string;
  username: string;
  profilePic?: string;
}

export class Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  friendInfo?: FriendInfo;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<Friendship>) {
    Object.assign(this, partial);
  }
}
