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

  async getMaxPosition(guildId: string): Promise<number> {
    const top = await this.prisma.channel.findFirst({
      where: { guildId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return top?.position ?? -1;
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

  async reorderBulk(guildId: string, orderedIds: string[]): Promise<void> {
    // Gộp toàn bộ update vào 1 câu SQL bằng unnest: mỗi id gán position = index
    // của nó trong mảng. 1 statement = 1 round trip = atomic sẵn, thay vì N
    // lệnh update tuần tự (N round trip tới Neon). Điều kiện "guildId" chặn
    // ghi nhầm channel guild khác.
    const positions = orderedIds.map((_, index) => index);
    await this.prisma.$executeRaw`
      UPDATE channels AS c
      SET position = v.pos
      FROM unnest(${orderedIds}::text[], ${positions}::int[]) AS v(id, pos)
      WHERE c.id = v.id AND c."guildId" = ${guildId}
    `;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.channel.delete({ where: { id } });
  }
}
