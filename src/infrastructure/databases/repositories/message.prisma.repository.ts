import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMessageData,
  MessageRepository,
} from 'src/core/domain/repositories/message.repository.interface';
import { Message } from 'src/core/domain/entities/message.entity';
import { MessageEmbed } from 'src/core/domain/entities/message-embed.entity';

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
      embeds: (row.embeds ?? []).map(
        (e: any) =>
          new MessageEmbed({
            id: e.id,
            url: e.url,
            provider: e.provider,
            refId: e.refId,
            title: e.title,
            description: e.description,
            imageUrl: e.imageUrl,
            siteName: e.siteName,
            authorName: e.authorName,
            embedUrl: e.embedUrl,
            position: e.position,
          }),
      ),
    });
  }
  async findByChannel(
    channelId: string,
    cursor?: string,
    limit = 30,
  ): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { channelId },
      include: { embeds: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });
    return rows.map((r) => this.map(r));
  }

  async create(data: CreateMessageData): Promise<Message> {
    const { embeds, ...rest } = data;
    const row = await this.prisma.message.create({
      data: {
        ...rest,
        ...(embeds?.length
          ? {
              embeds: {
                create: embeds.map((e, i) => ({
                  url: e.url,
                  provider: e.provider,
                  refId: e.refId ?? null,
                  position: i,
                })),
              },
            }
          : {}),
      },
      include: { embeds: { orderBy: { position: 'asc' } } },
    });
    return this.map(row);
  }

  async softDelete(messageId: string, userId?: string): Promise<boolean> {
    const result = await this.prisma.message.updateMany({
      where: {
        id: messageId,
        isDeleted: false,
        ...(userId ? { senderId: userId } : {}),
      },
      data: { isDeleted: true, content: '' },
    });

    return result.count > 0;
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
