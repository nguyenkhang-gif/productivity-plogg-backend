import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BookmarkRepository } from 'src/core/domain/repositories/bookmark.repository.interface';
import { Bookmark, BookmarkDocument } from '../schemas/bookmark.schema';

@Injectable()
export class MongoBookmarkRepository implements BookmarkRepository {
  constructor(
    @InjectModel(Bookmark.name)
    private readonly bookmarkModel: Model<BookmarkDocument>,
  ) {}

  async upsert(userId: string, postId: string): Promise<void> {
    await this.bookmarkModel.findOneAndUpdate(
      { userId, postId },
      { $setOnInsert: { userId, postId } },
      { upsert: true },
    );
  }

  async delete(userId: string, postId: string): Promise<void> {
    await this.bookmarkModel.findOneAndDelete({ userId, postId });
  }

  async countByUser(userId: string): Promise<number> {
    return this.bookmarkModel.countDocuments({ userId });
  }

  async getBookmarkedPostIds(
    userId: string,
    postIds: string[],
  ): Promise<Set<string>> {
    const docs = await this.bookmarkModel
      .find({ userId, postId: { $in: postIds } }, { postId: 1, _id: 0 })
      .lean();
    return new Set(docs.map((d: any) => d.postId));
  }
}
