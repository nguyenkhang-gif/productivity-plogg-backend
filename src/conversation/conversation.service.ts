import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation } from './schema/conversation.schema';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly MAX_MESSAGES = 10;

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
  ) {}

  async addMessage(userId: string, role: string, parts: { text: string }[]) {
    let convo = await this.conversationModel.findOne({ userId });

    if (!convo) {
      convo = new this.conversationModel({ userId, messages: [] });
    }

    convo.messages.push({ role, parts, timestamp: new Date() });
    if (convo.messages.length > this.MAX_MESSAGES) convo.messages.shift();

    convo.lastInteraction = new Date();
    await convo.save();

    return convo;
  }

  async updateSummary(conversationId: string, summary: string) {
    const convo = await this.conversationModel.findById(conversationId);
    if (!convo) throw new NotFoundException('Conversation not found');

    convo.summary = summary;
    convo.lastInteraction = new Date();
    await convo.save();

    this.logger.log(`📝 Updated summary for conversation ${conversationId}`);
    return convo;
  }
  async editConversation(
    conversationId: string,
    updateData: Partial<{
      summary: string;
      metadata: Record<string, any>;
      messages: {
        role: string;
        parts: {
          text: string;
        }[];
        timestamp: Date;
      }[];
    }>,
  ) {
    const convo = await this.conversationModel.findById(conversationId);
    if (!convo) throw new NotFoundException('Conversation not found');

    if (updateData.summary !== undefined) convo.summary = updateData.summary;
    if (updateData.metadata !== undefined) convo.metadata = updateData.metadata;
    if (updateData.messages !== undefined)
      convo.messages = updateData.messages.slice(-this.MAX_MESSAGES);

    convo.lastInteraction = new Date();
    await convo.save();

    this.logger.log(`🛠️ Edited conversation ${conversationId}`);
    return convo;
  }

  async clearConversations(userId: string) {
    const result = await this.conversationModel.find({ userId });
    console.log('result', result);
    if (!result) {
      this.logger.log(`No conversations found for ${userId} to clear.`);
      return { success: true, deleted: 0 };
    }

    result[0].messages = [];
    await result[0].save();

    return { success: true };
  }

  async clearOldConversations(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await this.conversationModel.deleteMany({
      lastInteraction: { $lt: cutoff },
    });

    this.logger.log(`🧹 Cleared ${result.deletedCount} old conversations`);
    return { success: true, deleted: result.deletedCount };
  }

  async getUserConversations(userId: string) {
    let conversations = await this.conversationModel
      .findOne({ userId })
      .sort({ updatedAt: -1 });

    // Nếu chưa có thì tạo mới 1 conversation trống
    if (!conversations) {
      const newConvo = await this.conversationModel.create({
        userId,
        messages: [],
        summary: '',
        lastInteraction: new Date(),
      });
      conversations = newConvo;
    }

    return conversations;
  }
}
