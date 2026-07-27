import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChannelRepository,
  CreateChannelData,
  UpdateChannelData,
} from 'src/core/domain/repositories/channel.repository.interface';
import { Channel } from 'src/core/domain/entities/channel.entity';

@Injectable()
export class ChannelPrismaRepository implements ChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): Channel {
    return new Channel({
      id: row.id,
      guildId: row.guildId,
      parentId: row.parentId,
      type: row.type,
      name: row.name,
      topic: row.topic,
      position: row.position,
      createdAt: row.createdAt,
    });
  }

  async findByGuild(guildId: string): Promise<Channel[]> {
    const rows = await this.prisma.channel.findMany({
      where: { guildId },
      orderBy: { position: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<Channel | null> {
    const row = await this.prisma.channel.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async create(data: CreateChannelData): Promise<Channel> {
    const row = await this.prisma.channel.create({ data });
    return this.map(row);
  }

  async update(id: string, data: UpdateChannelData): Promise<Channel> {
    const row = await this.prisma.channel.update({ where: { id }, data });
    return this.map(row);
  }

  async reorder(channelId: string, newPosition: number): Promise<void> {
    await this.prisma.channel.update({
      where: { id: channelId },
      data: { position: newPosition },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.channel.delete({ where: { id } });
  }
}
