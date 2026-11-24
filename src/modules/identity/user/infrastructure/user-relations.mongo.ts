import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Friendship,
  FriendshipDocument,
  Post,
  PostDocument,
} from 'src/modules/social';
import { UserRelations } from 'src/modules/identity/user/domain/user-relations.port';

@Injectable()
export class MongoUserRelations implements UserRelations {
  constructor(
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<FriendshipDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  async friendIdsOf(userId: string): Promise<string[]> {
    const friendships = await this.friendshipModel
      .find(
        { $or: [{ userId }, { friendId: userId }] },
        { userId: 1, friendId: 1, _id: 0 },
      )
      .lean();
    const ids = new Set<string>();
    for (const f of friendships as any[]) {
      ids.add(f.userId);
      ids.add(f.friendId);
    }
    ids.delete(userId);
    return [...ids];
  }

  async postCountsByAuthor(authorIds: string[]): Promise<Map<string, number>> {
    if (authorIds.length === 0) return new Map();
    const rows = await this.postModel.aggregate([
      { $match: { authorId: { $in: authorIds } } },
      { $group: { _id: '$authorId', count: { $sum: 1 } } },
    ]);
    return new Map<string, number>(rows.map((c: any) => [c._id, c.count]));
  }
}
