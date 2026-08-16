import { Injectable } from '@nestjs/common';
import { GuildInvite } from 'src/core/domain/entities/guild-invite.entity';
import {
  CreateInviteData,
  GuildInviteRepository,
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

  async incrementUses(code: string): Promise<void> {
    await this.prisma.guildInvite.update({
      where: { code },
      data: { uses: { increment: 1 } },
    });
  }
}
