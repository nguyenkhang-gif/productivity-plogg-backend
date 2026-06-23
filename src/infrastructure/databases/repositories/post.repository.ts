import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaginatedPosts,
  PostFeedFilter,
  PostRepository,
  PostStats,
} from 'src/core/domain/repositories/post.repository.interface';
import { Post as PostEntity } from 'src/core/domain/entities/post.entity';
import { Post, PostDocument } from '../schemas/post.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Friendship, FriendshipDocument } from '../schemas/friendship.schema';

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

const LOOKUP_CATEGORY = {
  $lookup: {
    from: 'categories',
    let: { catId: { $toObjectId: '$categoryId' } },
    pipeline: [
      { $match: { $expr: { $eq: ['$_id', '$$catId'] } } },
      { $project: { name: 1, slug: 1 } },
    ],
    as: '_category',
  },
};

const LOOKUP_TAGS = {
  $lookup: {
    from: 'tags',
    let: { tagIds: { $map: { input: '$tagIds', as: 't', in: { $toObjectId: '$$t' } } } },
    pipeline: [
      { $match: { $expr: { $in: ['$_id', '$$tagIds'] } } },
      { $project: { name: 1, slug: 1 } },
    ],
    as: '_tags',
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

const buildLookupBookmark = (userId: string) => ({
  $lookup: {
    from: 'bookmarks',
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
    as: '_bookmark',
  },
});

const buildAddComputedFields = (currentUserId?: string) => ({
  $addFields: {
    commentCount: { $ifNull: [{ $arrayElemAt: ['$_commentCount.total', 0] }, 0] },
    reactCount: { $ifNull: [{ $arrayElemAt: ['$_reactCount.total', 0] }, 0] },
    category: {
      $cond: {
        if: { $gt: [{ $size: '$_category' }, 0] },
        then: {
          id: { $toString: { $arrayElemAt: ['$_category._id', 0] } },
          name: { $arrayElemAt: ['$_category.name', 0] },
          slug: { $arrayElemAt: ['$_category.slug', 0] },
        },
        else: null,
      },
    },
    tags: {
      $map: {
        input: '$_tags',
        as: 't',
        in: { id: { $toString: '$$t._id' }, name: '$$t.name', slug: '$$t.slug' },
      },
    },
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
    isBookmarked: currentUserId
      ? { $gt: [{ $size: '$_bookmark' }, 0] }
      : false,
  },
});

const buildReadPipeline = (currentUserId?: string) => [
  ADD_AUTHOR_OBJ_ID,
  LOOKUP_AUTHOR,
  UNWIND_AUTHOR,
  LOOKUP_COMMENT_COUNT,
  LOOKUP_REACT_COUNT,
  LOOKUP_CATEGORY,
  LOOKUP_TAGS,
  ...(currentUserId ? [buildLookupUserReaction(currentUserId)] : []),
  ...(currentUserId ? [buildLookupBookmark(currentUserId)] : []),
  buildAddComputedFields(currentUserId),
];

// ─── Repository ───────────────────────────────────────────────────────────────

@Injectable()
export class MongoPostRepository implements PostRepository {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Friendship.name) private readonly friendshipModel: Model<FriendshipDocument>,
  ) {}

  private async getFriendIds(currentUserId: string): Promise<Set<string>> {
    const friendships = await this.friendshipModel.find(
      { status: 'accepted', $or: [{ userId: currentUserId }, { friendId: currentUserId }] },
      { userId: 1, friendId: 1, _id: 0 },
    ).lean();
    return new Set(
      friendships.map((f: any) => f.userId === currentUserId ? f.friendId : f.userId),
    );
  }

  private async buildVisibilityFilter(currentUserId: string) {
    const [friendIds, privateUsers] = await Promise.all([
      this.getFriendIds(currentUserId),
      this.userModel.find({ isPrivate: true }, { _id: 1 }).lean(),
    ]);

    // account-level: private account + not friend + not self → block entirely
    const privateAccountBlockedIds = (privateUsers as any[])
      .map(u => u._id.toString())
      .filter(id => !friendIds.has(id) && id !== currentUserId);

    const friendIdsArray = Array.from(friendIds);

    // per-post visibility filter:
    // PUBLIC  → show (unless author is private account blocked above)
    // FRIENDS → show only if currentUser is friend or author
    // PRIVATE → never show in feed (only author sees via findByAuthor)
    const visibilityConditions: any[] = [
      // PUBLIC posts from non-blocked accounts
      {
        visibility: 'PUBLIC',
        ...(privateAccountBlockedIds.length > 0 ? { authorId: { $nin: privateAccountBlockedIds } } : {}),
      },
      // FRIENDS posts from friends
      {
        visibility: 'FRIENDS',
        authorId: { $in: friendIdsArray },
      },
      // own PRIVATE posts
      {
        visibility: 'PRIVATE',
        authorId: currentUserId,
      },
      // own FRIENDS posts
      {
        visibility: 'FRIENDS',
        authorId: currentUserId,
      },
    ];

    return {
      isPublished: true,
      $or: visibilityConditions,
    };
  }

  private mapToDomain(doc: any): PostEntity {
    return new PostEntity({
      id: doc._id.toString(),
      authorId: doc.authorId,
      type: doc.type ?? 'ORIGINAL',
      title: doc.title ?? undefined,
      content: doc.content,
      imageUrls: doc.imageUrls,
      categoryId: doc.categoryId ?? null,
      tagIds: doc.tagIds ?? [],
      viewCount: doc.viewCount ?? 0,
      reactCount: doc.reactCount ?? 0,
      shareCount: doc.shareCount ?? 0,
      visibility: (doc.visibility ?? 'PUBLIC') as any,
      isPublished: doc.isPublished,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      originalPostId: doc.originalPostId ?? undefined,
      caption: doc.caption ?? undefined,
      author: doc._author
        ? {
            id: doc._author._id.toString(),
            fullName: doc._author.fullName,
            username: doc._author.username,
            profilePic: doc._author.profilePic,
          }
        : undefined,
      category: doc.category ?? null,
      tags: doc.tags ?? [],
      commentCount: doc.commentCount ?? 0,
      userReaction: doc.userReaction ?? null,
      isBookmarked: doc.isBookmarked ?? false,
    });
  }

  async findById(id: string, currentUserId?: string): Promise<PostEntity | null> {
    const [doc] = await this.postModel.aggregate([
      { $match: { $expr: { $and: [{ $eq: [{ $toString: '$_id' }, id] }, { $eq: ['$isPublished', true] }] } } },
      ...buildReadPipeline(currentUserId),
    ]);
    if (!doc) return null;

    const visibility = doc.visibility ?? 'PUBLIC';
    const authorId = doc.authorId;

    if (visibility === 'PRIVATE') {
      if (currentUserId !== authorId) throw new ForbiddenException('This post is private');
    } else if (visibility === 'FRIENDS') {
      if (currentUserId !== authorId) {
        if (!currentUserId) throw new ForbiddenException('This post is for friends only');
        const friendIds = await this.getFriendIds(currentUserId);
        if (!friendIds.has(authorId)) throw new ForbiddenException('This post is for friends only');
      }
    }

    return this.mapToDomain(doc);
  }

  async findAll(page: number, limit: number, currentUserId: string, filter?: PostFeedFilter): Promise<PaginatedPosts> {
    const skip = (page - 1) * limit;
    const visibilityFilter = await this.buildVisibilityFilter(currentUserId);

    const extraFilter: Record<string, any> = {};
    if (filter?.categoryId) extraFilter.categoryId = filter.categoryId;
    if (filter?.excludeId) extraFilter._id = { $ne: filter.excludeId };
    if (filter?.tags?.length) {
      const tagSlugs = filter.tags;
      const tagDocs = await this.postModel.db.collection('tags').find({ slug: { $in: tagSlugs } }, { projection: { _id: 1 } }).toArray();
      const tagIds = tagDocs.map((t: any) => t._id.toString());
      if (tagIds.length) extraFilter.tagIds = { $in: tagIds };
    }

    const matchFilter = { ...visibilityFilter, ...extraFilter, type: { $ne: 'REPOST' } };

    const [total, items] = await Promise.all([
      this.postModel.countDocuments(matchFilter),
      this.postModel.aggregate([
        { $match: matchFilter },
        { $sort: filter?.sortByUpdatedAt != null ? { updatedAt: filter.sortByUpdatedAt } : { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        ...buildReadPipeline(currentUserId),
      ]),
    ]);

    return {
      items: items.map((doc) => this.mapToDomain(doc)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByAuthor(authorId: string, page: number, limit: number, currentUserId: string): Promise<PaginatedPosts> {
    const skip = (page - 1) * limit;
    const isSelf = currentUserId === authorId;
    let visibilityCondition: any;

    if (isSelf) {
      // author sees all their own posts
      visibilityCondition = {};
    } else if (currentUserId) {
      const friendIds = await this.getFriendIds(currentUserId);
      const isFriend = friendIds.has(authorId);
      visibilityCondition = isFriend
        ? { visibility: { $in: ['PUBLIC', 'FRIENDS'] } }
        : { visibility: 'PUBLIC' };
    } else {
      // unauthenticated — only PUBLIC
      visibilityCondition = { visibility: 'PUBLIC' };
    }

    const filter = { isPublished: true, authorId, type: { $ne: 'REPOST' }, ...visibilityCondition };

    const [total, items] = await Promise.all([
      this.postModel.countDocuments(filter),
      this.postModel.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        ...buildReadPipeline(currentUserId),
      ]),
    ]);

    return {
      items: items.map((doc) => this.mapToDomain(doc)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findTrending(limit: number, currentUserId: string): Promise<PostEntity[]> {
    const visibilityFilter = await this.buildVisibilityFilter(currentUserId);
    const items = await this.postModel.aggregate([
      { $match: visibilityFilter },
      ...buildReadPipeline(currentUserId),
      { $sort: { reactCount: -1, createdAt: -1 } },
      { $limit: limit },
    ]);
    return items.map((doc) => this.mapToDomain(doc));
  }

  async getStatsByAuthor(authorId: string): Promise<PostStats> {
    const [result] = await this.postModel.aggregate([
      { $match: { authorId, isPublished: true } },
      {
        $lookup: {
          from: 'reactions',
          let: { postId: { $toString: '$_id' } },
          pipeline: [{ $match: { $expr: { $eq: ['$postId', '$$postId'] } } }],
          as: '_reactions',
        },
      },
      {
        $lookup: {
          from: 'comments',
          let: { postId: { $toString: '$_id' } },
          pipeline: [{ $match: { $expr: { $eq: ['$postId', '$$postId'] } } }],
          as: '_comments',
        },
      },
      {
        $group: {
          _id: null,
          postCount: { $sum: 1 },
          totalReactionsReceived: { $sum: { $size: '$_reactions' } },
          totalComments: { $sum: { $size: '$_comments' } },
        },
      },
    ]);

    return {
      postCount: result?.postCount ?? 0,
      totalReactionsReceived: result?.totalReactionsReceived ?? 0,
      totalComments: result?.totalComments ?? 0,
    };
  }

  async create(post: PostEntity): Promise<PostEntity> {
    const created = new this.postModel({
      authorId: post.authorId,
      type: post.type ?? 'ORIGINAL',
      title: post.title ?? null,
      content: post.content,
      imageUrls: post.imageUrls ?? [],
      isPublished: post.isPublished ?? true,
      categoryId: post.categoryId ?? null,
      tagIds: post.tagIds ?? [],
      viewCount: 0,
      shareCount: 0,
      originalPostId: post.originalPostId ?? null,
      caption: post.caption ?? null,
      visibility: post.visibility ?? 'PUBLIC',
    });
    const saved = await created.save();
    const full = await this.findById(saved._id.toString(), post.authorId);
    return full!;
  }

  async update(id: string, data: Partial<PostEntity>, currentUserId?: string): Promise<PostEntity> {
    const updated = await this.postModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!updated) throw new NotFoundException('Post not found');
    const full = await this.findById(id, currentUserId);
    return full!;
  }

  async delete(id: string): Promise<void> {
    const result = await this.postModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Post not found');
  }

  async incrementViewCount(id: string): Promise<void> {
    const result = await this.postModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    if (!result) throw new NotFoundException('Post not found');
  }

  async nullifyCategoryOnPosts(categoryId: string): Promise<void> {
    await this.postModel.updateMany({ categoryId }, { $set: { categoryId: null } });
  }

  async countByAuthor(authorId: string): Promise<number> {
    return this.postModel.countDocuments({ authorId });
  }

  async findRepostByUser(originalPostId: string, userId: string): Promise<PostEntity | null> {
    const doc = await this.postModel.findOne({
      type: 'REPOST',
      originalPostId,
      authorId: userId,
      isPublished: true,
    }).lean().exec();
    if (!doc) return null;
    return new PostEntity({
      id: (doc as any)._id.toString(),
      authorId: (doc as any).authorId,
      type: (doc as any).type,
      originalPostId: (doc as any).originalPostId,
      caption: (doc as any).caption ?? undefined,
      content: (doc as any).content,
      isPublished: (doc as any).isPublished,
      shareCount: (doc as any).shareCount ?? 0,
      reactCount: (doc as any).reactCount ?? 0,
    });
  }

  async getShareCount(postId: string): Promise<number> {
    const doc = await this.postModel.findById(postId, { shareCount: 1 }).lean().exec();
    return (doc as any)?.shareCount ?? 0;
  }

  async incrementShareCount(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { shareCount: 1 } }).exec();
  }

  async decrementShareCount(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { shareCount: -1 } }).exec();
  }
}
