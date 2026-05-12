import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaginatedPosts,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { Post as PostEntity } from 'src/core/domain/entities/post.entity';
import { Post, PostDocument } from '../schemas/post.schema';

// ─── Shared ───────────────────────────────────────────────────────────────────

const ADD_AUTHOR_OBJ_ID = {
  $addFields: { _authorObjId: { $toObjectId: '$authorId' } },
};

// ─── Read pipeline ────────────────────────────────────────────────────────────

const LOOKUP_AUTHOR = {
  $lookup: {
    from: 'users',
    localField: '_authorObjId',
    foreignField: '_id',
    as: '_author',
    pipeline: [{ $project: { fullName: 1, username: 1, profilePic: 1, isPrivate: 1 } }],
  },
};

const UNWIND_AUTHOR = {
  $unwind: { path: '$_author', preserveNullAndEmptyArrays: true },
};

const LOOKUP_COMMENT_COUNT = {
  $lookup: {
    from: 'comments',
    let: { postId: { $toString: '$_id' } },
    pipeline: [
      { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
      { $count: 'total' },
    ],
    as: '_commentCount',
  },
};

const LOOKUP_REACT_COUNT = {
  $lookup: {
    from: 'reactions',
    let: { postId: { $toString: '$_id' } },
    pipeline: [
      { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
      { $count: 'total' },
    ],
    as: '_reactCount',
  },
};

const buildLookupUserReaction = (userId: string) => ({
  $lookup: {
    from: 'reactions',
    let: { postId: { $toString: '$_id' } },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$postId', '$$postId'] },
              { $eq: ['$userId', userId] },
            ],
          },
        },
      },
    ],
    as: '_userReaction',
  },
});

const buildAddComputedFields = (currentUserId?: string) => ({
  $addFields: {
    commentCount: { $ifNull: [{ $arrayElemAt: ['$_commentCount.total', 0] }, 0] },
    reactCount: { $ifNull: [{ $arrayElemAt: ['$_reactCount.total', 0] }, 0] },
    userReaction: currentUserId
      ? {
          $cond: {
            if: { $gt: [{ $size: '$_userReaction' }, 0] },
            then: {
              type: { $arrayElemAt: ['$_userReaction.type', 0] },
              icon: { $arrayElemAt: ['$_userReaction.icon', 0] },
            },
            else: null,
          },
        }
      : null,
  },
});

const buildReadPipeline = (currentUserId?: string) => [
  ADD_AUTHOR_OBJ_ID,
  LOOKUP_AUTHOR,
  UNWIND_AUTHOR,
  LOOKUP_COMMENT_COUNT,
  LOOKUP_REACT_COUNT,
  ...(currentUserId ? [buildLookupUserReaction(currentUserId)] : []),
  buildAddComputedFields(currentUserId),
];

// ─── Visibility pipeline ──────────────────────────────────────────────────────

const LOOKUP_AUTHOR_PRIVACY = {
  $lookup: {
    from: 'users',
    localField: '_authorObjId',
    foreignField: '_id',
    as: '_authorMeta',
    pipeline: [{ $project: { isPrivate: 1 } }],
  },
};

const UNWIND_AUTHOR_META = {
  $unwind: { path: '$_authorMeta', preserveNullAndEmptyArrays: true },
};

const buildLookupFriendship = (currentUserId: string) => ({
  $lookup: {
    from: 'friendships',
    let: { authorId: '$authorId' },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$status', 'accepted'] },
              {
                $or: [
                  { $and: [{ $eq: ['$userId', currentUserId] }, { $eq: ['$friendId', '$$authorId'] }] },
                  { $and: [{ $eq: ['$friendId', currentUserId] }, { $eq: ['$userId', '$$authorId'] }] },
                ],
              },
            ],
          },
        },
      },
    ],
    as: '_friendship',
  },
});

const buildVisibilityMatch = (currentUserId: string) => ({
  $match: {
    $or: [
      { '_authorMeta.isPrivate': { $ne: true } },
      { '_friendship': { $ne: [] } },
      { authorId: currentUserId },
    ],
  },
});

// Filters out posts the viewer has no right to see:
// - author is public, OR viewer is the author, OR viewer is an accepted friend
const buildVisibilityPipeline = (currentUserId: string) => [
  ADD_AUTHOR_OBJ_ID,
  LOOKUP_AUTHOR_PRIVACY,
  UNWIND_AUTHOR_META,
  buildLookupFriendship(currentUserId),
  buildVisibilityMatch(currentUserId),
];

// ─── Repository ───────────────────────────────────────────────────────────────

@Injectable()
export class MongoPostRepository implements PostRepository {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  private mapToDomain(doc: any): PostEntity {
    return new PostEntity({
      id: doc._id.toString(),
      authorId: doc.authorId,
      content: doc.content,
      imageUrls: doc.imageUrls,
      reactCount: doc.reactCount ?? 0,
      isPublished: doc.isPublished,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      author: doc._author
        ? {
            id: doc._author._id.toString(),
            fullName: doc._author.fullName,
            username: doc._author.username,
            profilePic: doc._author.profilePic,
          }
        : undefined,
      commentCount: doc.commentCount ?? 0,
      userReaction: doc.userReaction ?? null,
    });
  }

  async findById(id: string, currentUserId?: string): Promise<PostEntity | null> {
    const [doc] = await this.postModel.aggregate([
      { $match: { $expr: { $and: [{ $eq: [{ $toString: '$_id' }, id] }, { $eq: ['$isPublished', true] }] } } },
      ...buildReadPipeline(currentUserId),
    ]);
    return doc ? this.mapToDomain(doc) : null;
  }

  async findAll(page: number, limit: number, currentUserId: string): Promise<PaginatedPosts> {
    const skip = (page - 1) * limit;

    const [result] = await this.postModel.aggregate([
      { $match: { isPublished: true } },
      ...buildVisibilityPipeline(currentUserId),
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }, ...buildReadPipeline(currentUserId)],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result.total[0]?.count ?? 0;
    return {
      items: result.items.map((doc) => this.mapToDomain(doc)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByAuthor(authorId: string, page: number, limit: number, currentUserId: string): Promise<PaginatedPosts> {
    const skip = (page - 1) * limit;

    const [result] = await this.postModel.aggregate([
      { $match: { authorId, isPublished: true } },
      ...buildVisibilityPipeline(currentUserId),
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }, ...buildReadPipeline(currentUserId)],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result.total[0]?.count ?? 0;
    return {
      items: result.items.map((doc) => this.mapToDomain(doc)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(post: PostEntity): Promise<PostEntity> {
    const created = new this.postModel({
      authorId: post.authorId,
      content: post.content,
      imageUrls: post.imageUrls ?? [],
      isPublished: post.isPublished ?? true,
    });
    const saved = await created.save();
    return new PostEntity({
      id: saved._id.toString(),
      authorId: saved.authorId,
      content: saved.content,
      imageUrls: saved.imageUrls,
      reactCount: 0,
      isPublished: saved.isPublished,
      createdAt: (saved as any).createdAt,
      updatedAt: (saved as any).updatedAt,
    });
  }

  async update(id: string, data: Partial<PostEntity>): Promise<PostEntity> {
    const updated = await this.postModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Post not found');
    return new PostEntity({
      id: updated._id.toString(),
      authorId: updated.authorId,
      content: updated.content,
      imageUrls: updated.imageUrls,
      reactCount: 0,
      isPublished: updated.isPublished,
      createdAt: (updated as any).createdAt,
      updatedAt: (updated as any).updatedAt,
    });
  }

  async delete(id: string): Promise<void> {
    const result = await this.postModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Post not found');
  }
}
