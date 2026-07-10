import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddGuildMemberData,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import { GuildMember } from 'src/core/domain/entities/guild-member.entity';

@Injectable()
export class GuildMemberPrismaRepository implements GuildMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): GuildMember {
    return new GuildMember({
      guildId: row.guildId,
      userId: row.userId,
      username: row.username,
      avatar: row.avatar,
      nickname: row.nickname,
      joinedAt: row.joinedAt,
    });
  }

  async findByGuild(guildId: string): Promise<GuildMember[]> {
    const rows = await this.prisma.guildMember.findMany({ where: { guildId } });
    return rows.map((r) => this.map(r));
  }

  async findMember(
    guildId: string,
    userId: string,
  ): Promise<GuildMember | null> {
    const row = await this.prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });
    return row ? this.map(row) : null;
  }

  async isMember(guildId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.guildMember.count({
      where: { guildId, userId },
    });
    return count > 0;
  }

  async add(data: AddGuildMemberData): Promise<GuildMember> {
    const row = await this.prisma.guildMember.create({ data });
    return this.map(row);
  }

  async remove(guildId: string, userId: string): Promise<void> {
    await this.prisma.guildMember.delete({
      where: { guildId_userId: { guildId, userId } },
    });
  }

  async assignRole(
    guildId: string,
    userId: string,
    roleId: string,
  ): Promise<void> {
    await this.prisma.guildMemberRole.create({
      data: { guildId, userId, roleId },
    });
  }

  async getResolvedPermissions(
    guildId: string,
    userId: string,
  ): Promise<bigint> {
    const guild = await this.prisma.guild.findUniqueOrThrow({
      where: { id: guildId },
    });
    if (guild.ownerId === userId) {
      return 1n << 8n; // ADMINISTRATOR
    }

    const memberRoles = await this.prisma.guildMemberRole.findMany({
      where: { guildId, userId },
      include: { role: true },
    });

    return memberRoles.reduce((acc, mr) => acc | mr.role.permissions, 0n);
  }
}
