import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationRepository } from 'src/core/domain/repositories/conversation.repository.interface';
import { Conversation as ConversationEntity } from 'src/core/domain/entities/conversation.entity';
import { Conversation, ConversationDocument } from '../schemas/conversation.schema';

@Injectable()
export class MongoConversationRepository implements ConversationRepository {
  constructor(
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
  ) {}

  private mapToDomain(doc: any): ConversationEntity {
    return new ConversationEntity({
      id: doc._id.toString(),
      participants: doc.participants,
      lastMessage: doc.lastMessage,
      lastMessageAt: doc.lastMessageAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findById(id: string): Promise<ConversationEntity | null> {
    const doc = await this.conversationModel.findById(id).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async findOrCreate(participants: string[]): Promise<ConversationEntity> {
    const sorted = [...participants].sort();
    const existing = await this.conversationModel
      .findOne({ participants: { $all: sorted, $size: sorted.length } })
      .exec();

    if (existing) return this.mapToDomain(existing);

    const created = new this.conversationModel({ participants: sorted });
    const saved = await created.save();
    return this.mapToDomain(saved);
  }

  async findByUserId(userId: string): Promise<ConversationEntity[]> {
    const docs = await this.conversationModel
      .find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .exec();
    return docs.map((doc) => this.mapToDomain(doc));
  }

  async updateLastMessage(id: string, content: string, at: Date): Promise<void> {
    await this.conversationModel
      .findByIdAndUpdate(id, { lastMessage: content, lastMessageAt: at })
      .exec();
  }
}
