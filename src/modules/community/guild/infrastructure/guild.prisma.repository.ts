import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import {
  CreateGuildData,
  GuildRepository,
  UpdateGuildData,
} from 'src/modules/community/guild/domain/guild.repository.interface';
import { Guild } from 'src/modules/community/guild/domain/guild.entity';

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

  async update(id: string, data: UpdateGuildData): Promise<Guild> {
    const row = await this.prisma.guild.update({ where: { id }, data });
    return this.map(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.guild.delete({ where: { id } });
  }
}
