import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaginatedPosts,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { Post as PostEntity } from 'src/core/domain/entities/post.entity';
import { Post, PostDocument } from '../schemas/post.schema';

// Joins author info (including isPrivate) and comment count
const READ_PIPELINE = [
  { $addFields: { _authorObjId: { $toObjectId: '$authorId' } } },
  {
    $lookup: {
      from: 'users',
      localField: '_authorObjId',
      foreignField: '_id',
      as: '_author',
      pipeline: [{ $project: { fullName: 1, username: 1, profilePic: 1, isPrivate: 1 } }],
    },
  },
  { $unwind: { path: '$_author', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'comments',
      let: { postId: { $toString: '$_id' } },
      pipeline: [
        { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
        { $count: 'total' },
      ],
      as: '_commentCount',
    },
  },
  {
    $addFields: {
      commentCount: { $ifNull: [{ $arrayElemAt: ['$_commentCount.total', 0] }, 0] },
    },
  },
];

// Build privacy filter stages for a given viewer:
// - author is public, OR viewer is the author, OR viewer is an accepted friend
const buildVisibilityPipeline = (currentUserId: string) => [
  { $addFields: { _authorObjId: { $toObjectId: '$authorId' } } },
  {
    $lookup: {
      from: 'users',
      localField: '_authorObjId',
      foreignField: '_id',
      as: '_authorMeta',
      pipeline: [{ $project: { isPrivate: 1 } }],
    },
  },
  { $unwind: { path: '$_authorMeta', preserveNullAndEmptyArrays: true } },
  {
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
  },
  {
    $match: {
      $or: [
        { '_authorMeta.isPrivate': { $ne: true } },
        { '_friendship': { $ne: [] } },
        { authorId: currentUserId },
      ],
    },
  },
];

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
      likesCount: doc.likesCount,
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
    });
  }

  async findById(id: string): Promise<PostEntity | null> {
    const [doc] = await this.postModel.aggregate([
      { $match: { $expr: { $and: [{ $eq: [{ $toString: '$_id' }, id] }, { $eq: ['$isPublished', true] }] } } },
      ...READ_PIPELINE,
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
          items: [{ $skip: skip }, { $limit: limit }, ...READ_PIPELINE],
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
          items: [{ $skip: skip }, { $limit: limit }, ...READ_PIPELINE],
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
      likesCount: saved.likesCount,
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
      likesCount: updated.likesCount,
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
