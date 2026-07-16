import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMessageData,
  MessageRepository,
} from 'src/core/domain/repositories/message.repository.interface';
import { Message } from 'src/core/domain/entities/message.entity';

@Injectable()
export class MessagePrismaRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): Message {
    return new Message({
      id: row.id,
      channelId: row.channelId,
      senderId: row.senderId,
      senderName: row.senderName,
      senderAvatar: row.senderAvatar,
      replyToId: row.replyToId,
      type: row.type,
      content: row.content,
      isDeleted: row.isDeleted,
      editedAt: row.editedAt,
      createdAt: row.createdAt,
    });
  }

  async findByChannel(
    channelId: string,
    cursor?: string,
    limit = 30,
  ): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });
    return rows.map((r) => this.map(r));
  }

  async create(data: CreateMessageData): Promise<Message> {
    const row = await this.prisma.message.create({ data });
    return this.map(row);
  }

  async softDelete(messageId: string, userId?: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: userId ? { id: messageId, senderId: userId } : { id: messageId },
      data: { isDeleted: true, content: '' },
    });
  }

  async edit(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<Message | null> {
    const result = await this.prisma.message.updateMany({
      where: { id: messageId, senderId: userId },
      data: { content, editedAt: new Date() },
    });
    if (result.count === 0) return null;
    const row = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    return row ? this.map(row) : null;
  }

  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    await this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    await this.prisma.messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });
  }
}
