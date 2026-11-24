import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Role } from 'src/modules/community/role/domain/role.entity';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from 'src/modules/community/role/domain/role.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';

@Injectable()
export class GetRolesUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(guildId: string, userId: string): Promise<Role[]> {
    const isMember = await this.memberRepo.isMember(guildId, userId);
    if (!isMember) throw new ForbiddenException('Not a member of this guild');
    return this.roleRepo.findByGuild(guildId);
  }
}
