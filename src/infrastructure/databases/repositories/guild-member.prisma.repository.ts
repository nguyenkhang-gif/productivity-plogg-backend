import { Injectable } from '@nestjs/common';
import { GuildMember } from 'src/core/domain/entities/guild-member.entity';
import {
  AddGuildMemberData,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import { PrismaService } from '../prisma/prisma.service';

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

  async findByGuild(
    guildId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<GuildMember[]> {
    const rows = await this.prisma.guildMember.findMany({
      where: { guildId },
      orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { guildId_userId: { guildId, userId: cursor } },
      }),
    });
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
    // Prisma bỏ qua field có giá trị `undefined` trong `where` thay vì lọc
    // theo nó — nếu không chặn ở đây, userId undefined/rỗng sẽ khiến query
    // đếm TOÀN BỘ member của guild thay vì không khớp ai, trả về sai `true`.
    if (!guildId || !userId) return false;

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

  async getHighestRolePosition(
    guildId: string,
    userId: string,
  ): Promise<number> {
    const memberRoles = await this.prisma.guildMemberRole.findMany({
      where: { guildId, userId },
      include: { role: true },
    });
    if (memberRoles.length === 0) return -1;
    return Math.max(...memberRoles.map((mr) => mr.role.position));
  }
}
