import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  GUILD_INVITE_REPOSITORY,
  GuildInviteRepository,
} from 'src/core/domain/repositories/guild-invite.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/core/domain/repositories/guild.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';

export interface InvitePreview {
  code: string;
  guild: {
    id: string;
    name: string;
    icon?: string | null;
    memberCount: number;
  };
}

@Injectable()
export class GetInvitePreviewUseCase {
  constructor(
    @Inject(GUILD_INVITE_REPOSITORY)
    private readonly inviteRepo: GuildInviteRepository,
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(code: string): Promise<InvitePreview> {
    const invite = await this.inviteRepo.findByCode(code);
    if (!invite) throw new NotFoundException('Invite not found');

    const guild = await this.guildRepo.findById(invite.guildId);
    if (!guild) throw new NotFoundException('Guild not found');

    const memberCount = await this.memberRepo.countByGuild(guild.id);

    // Chỉ lộ thông tin tối thiểu — KHÔNG trả channel/member list cho người chưa join.
    return {
      code: invite.code,
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        memberCount,
      },
    };
  }
}
