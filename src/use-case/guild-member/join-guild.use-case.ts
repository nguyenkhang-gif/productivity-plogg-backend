import { Inject, Injectable } from '@nestjs/common';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from 'src/core/domain/repositories/role.repository.interface';

export interface JoinGuildInput {
  guildId: string;
  userId: string;
  username: string;
  avatar: string | null;
}

@Injectable()
export class JoinGuildUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepository,
  ) {}

  async execute(input: JoinGuildInput) {
    const already = await this.memberRepo.isMember(input.guildId, input.userId);
    if (already) return;

    const member = await this.memberRepo.add(input);

    const defaultRole = await this.roleRepo.findDefaultByGuild(input.guildId);
    if (defaultRole) {
      await this.memberRepo.assignRole(
        input.guildId,
        input.userId,
        defaultRole.id,
      );
    }
    return member;
  }
}
