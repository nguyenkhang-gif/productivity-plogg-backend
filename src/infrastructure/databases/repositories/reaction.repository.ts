import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReactionRepository } from 'src/core/domain/repositories/reaction.repository.interface';
import { Reaction as ReactionEntity } from 'src/core/domain/entities/reaction.entity';
import { Reaction, ReactionDocument } from '../schemas/reaction.schema';

@Injectable()
export class MongoReactionRepository implements ReactionRepository {
  constructor(
    @InjectModel(Reaction.name)
    private readonly reactionModel: Model<ReactionDocument>,
  ) {}

  private mapToDomain(doc: any): ReactionEntity {
    return new ReactionEntity({
      id: doc._id.toString(),
      postId: doc.postId,
      userId: doc.userId,
      type: doc.type,
      icon: doc.icon,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findByPostAndUser(
    postId: string,
    userId: string,
  ): Promise<ReactionEntity | null> {
    const doc = await this.reactionModel.findOne({ postId, userId }).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async save(reaction: ReactionEntity): Promise<ReactionEntity> {
    const doc = await this.reactionModel
      .findOneAndUpdate(
        { postId: reaction.postId, userId: reaction.userId },
        { type: reaction.type, icon: reaction.icon },
        { upsert: true, new: true },
      )
      .exec();
    return this.mapToDomain(doc);
  }

  async deleteByPostAndUser(postId: string, userId: string): Promise<void> {
    await this.reactionModel.deleteOne({ postId, userId }).exec();
  }
}
