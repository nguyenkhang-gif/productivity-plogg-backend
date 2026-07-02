import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageRepository } from 'src/core/domain/repositories/message.repository.interface';
import { Message as MessageEntity } from 'src/core/domain/entities/message.entity';
import { Message, MessageDocument } from '../schemas/message.schema';

@Injectable()
export class MongoMessageRepository implements MessageRepository {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  private mapToDomain(doc: any): MessageEntity {
    return new MessageEntity({
      id: doc._id.toString(),
      conversationId: doc.conversationId,
      senderId: doc.senderId,
      content: doc.content,
      type: doc.type,
      readBy: doc.readBy,
      createdAt: doc.createdAt,
    });
  }

  async save(message: MessageEntity): Promise<MessageEntity> {
    const created = new this.messageModel({
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      type: message.type ?? 'text',
      readBy: message.readBy ?? [],
    });
    const saved = await created.save();
    return this.mapToDomain(saved);
  }

  async findByConversationId(
    conversationId: string,
    limit: number,
    before?: Date,
  ): Promise<MessageEntity[]> {
    const query: any = { conversationId };
    if (before) query.createdAt = { $lt: before };

    const docs = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return docs.reverse().map((doc) => this.mapToDomain(doc));
  }
}
