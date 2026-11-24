import { Injectable } from '@nestjs/common';
import { GuildInvite } from 'src/core/domain/entities/guild-invite.entity';
import {
  CreateInviteData,
  GuildInviteRepository,
  JoinWithInviteData,
  JoinWithInviteResult,
} from 'src/core/domain/repositories/guild-invite.repository.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuildInvitePrismaRepository implements GuildInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): GuildInvite {
    return new GuildInvite({
      code: row.code,
      guildId: row.guildId,
      createdBy: row.createdBy,
      maxUses: row.maxUses,
      uses: row.uses,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  }

  async create(data: CreateInviteData): Promise<GuildInvite> {
    const row = await this.prisma.guildInvite.create({ data });
    return this.map(row);
  }

  async findByCode(code: string): Promise<GuildInvite | null> {
    const row = await this.prisma.guildInvite.findUnique({ where: { code } });
    return row ? this.map(row) : null;
  }

  async joinWithInvite(
    data: JoinWithInviteData,
  ): Promise<JoinWithInviteResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.$executeRaw`
          UPDATE "guild_invites"
          SET "uses" = "uses" + 1
          WHERE "code" = ${data.code}
            AND ("maxUses" IS NULL OR "uses" < "maxUses")
            AND ("expiresAt" IS NULL OR "expiresAt" > (now() AT TIME ZONE 'UTC'))`;
        if (updated === 0) return 'unavailable' as const;

        await tx.guildMember.create({
          data: {
            guildId: data.guildId,
            userId: data.userId,
            username: data.username,
            avatar: data.avatar ?? null,
          },
        });
        if (data.defaultRoleId) {
          await tx.guildMemberRole.create({
            data: {
              guildId: data.guildId,
              userId: data.userId,
              roleId: data.defaultRoleId,
            },
          });
        }
        return 'joined' as const;
      });
    } catch (e: any) {
      if (e?.code === 'P2002') return 'already_member';
      throw e;
    }
  }

  async delete(code: string): Promise<void> {
    await this.prisma.guildInvite.deleteMany({ where: { code } });
  }
}
