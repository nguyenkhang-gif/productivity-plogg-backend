import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  GUILD_INVITE_REPOSITORY,
  GuildInviteRepository,
} from 'src/core/domain/repositories/guild-invite.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from 'src/core/domain/repositories/role.repository.interface';

export interface JoinViaInviteInput {
  code: string;
  userId: string;
  username: string;
  avatar?: string | null;
}

@Injectable()
export class JoinViaInviteUseCase {
  constructor(
    @Inject(GUILD_INVITE_REPOSITORY)
    private readonly inviteRepo: GuildInviteRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
  ) {}

  async execute(input: JoinViaInviteInput): Promise<{ guildId: string }> {
    const invite = await this.inviteRepo.findByCode(input.code);
    if (!invite) throw new NotFoundException('Invite not found');
    // MVP: chưa check expiresAt/maxUses (Full sẽ thêm → 410 Gone).

    const guildId = invite.guildId;

    // Đã là member → vào thẳng, không tăng uses (idempotent).
    if (await this.memberRepo.isMember(guildId, input.userId)) {
      return { guildId };
    }

    await this.memberRepo.add({
      guildId,
      userId: input.userId,
      username: input.username,
      avatar: input.avatar ?? null,
    });

    const defaultRole = await this.roleRepo.findDefaultByGuild(guildId);
    if (defaultRole) {
      await this.memberRepo.assignRole(guildId, input.userId, defaultRole.id);
    }

    await this.inviteRepo.incrementUses(input.code);
    return { guildId };
  }
}
