import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  GuildPermissions,
  hasPermission,
} from 'src/core/domain/constants/guild-permissions';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';

@Injectable()
export class AssignRoleUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(
    guildId: string,
    actorId: string,
    targetId: string,
    roleId: string,
  ): Promise<void> {
    const perms = await this.memberRepo.getResolvedPermissions(
      guildId,
      actorId,
    );
    if (!hasPermission(perms, GuildPermissions.MANAGE_ROLES))
      throw new ForbiddenException();
    await this.memberRepo.assignRole(guildId, targetId, roleId);
  }
}
