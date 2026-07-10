import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGuildData,
  GuildRepository,
} from 'src/core/domain/repositories/guild.repository.interface';
import { Guild } from 'src/core/domain/entities/guild.entity';

@Injectable()
export class GuildPrismaRepository implements GuildRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): Guild {
    return new Guild({
      id: row.id,
      name: row.name,
      icon: row.icon,
      ownerId: row.ownerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(id: string): Promise<Guild | null> {
    const row = await this.prisma.guild.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }
  async findByMember(userId: string): Promise<Guild[]> {
    const rows = await this.prisma.guild.findMany({
      where: { members: { some: { userId } } },
    });
    return rows.map((r) => this.map(r));
  }

  async create(data: CreateGuildData): Promise<Guild> {
    const row = await this.prisma.guild.create({ data });
    return this.map(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.guild.delete({ where: { id } });
  }
}
