import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CommentRepository,
  PaginatedComments,
} from 'src/core/domain/repositories/comment.repository.interface';
import { Comment as CommentEntity } from 'src/core/domain/entities/comment.entity';
import { Comment, CommentDocument } from '../schemas/comment.schema';

const AUTHOR_LOOKUP = [
  { $addFields: { _authorObjId: { $toObjectId: '$authorId' } } },
  {
    $lookup: {
      from: 'users',
      localField: '_authorObjId',
      foreignField: '_id',
      as: '_author',
      pipeline: [{ $project: { fullName: 1, username: 1, profilePic: 1 } }],
    },
  },
  { $unwind: { path: '$_author', preserveNullAndEmptyArrays: true } },
];

@Injectable()
export class MongoCommentRepository implements CommentRepository {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<CommentDocument>,
  ) {}

  private mapToDomain(doc: any): CommentEntity {
    return new CommentEntity({
      id: doc._id.toString(),
      postId: doc.postId,
      authorId: doc.authorId,
      content: doc.content,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      iconUrl: doc.iconUrl,
      author: doc._author
        ? {
            id: doc._author._id.toString(),
            fullName: doc._author.fullName,
            username: doc._author.username,
            profilePic: doc._author.profilePic,
          }
        : undefined,
    });
  }

  async findById(id: string): Promise<CommentEntity | null> {
    const [doc] = await this.commentModel.aggregate([
      { $match: { $expr: { $eq: [{ $toString: '$_id' }, id] } } },
      ...AUTHOR_LOOKUP,
    ]);
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByPost(postId: string, page: number, limit: number): Promise<PaginatedComments> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.commentModel.aggregate([
        { $match: { postId } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        ...AUTHOR_LOOKUP,
      ]),
      this.commentModel.countDocuments({ postId }),
    ]);

    return {
      items: items.map((doc) => this.mapToDomain(doc)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(comment: CommentEntity): Promise<CommentEntity> {
    const created = new this.commentModel({
      postId: comment.postId,
      authorId: comment.authorId,
      content: comment.content,
      iconUrl: comment.iconUrl,
    });
    const saved = await created.save();
    return this.findById(saved._id.toString());
  }

  async update(id: string, content: string): Promise<CommentEntity> {
    const updated = await this.commentModel
      .findByIdAndUpdate(id, { content }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Comment not found');
    return new CommentEntity({
      id: updated._id.toString(),
      postId: updated.postId,
      authorId: updated.authorId,
      content: updated.content,
      createdAt: (updated as any).createdAt,
      updatedAt: (updated as any).updatedAt,
    });
  }

  async delete(id: string): Promise<void> {
    const result = await this.commentModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Comment not found');
  }
}
