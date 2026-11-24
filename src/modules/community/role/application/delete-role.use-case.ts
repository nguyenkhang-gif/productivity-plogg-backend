import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GuildPermissions,
  hasPermission,
} from 'src/modules/community/guild/domain/guild-permissions';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from 'src/modules/community/role/domain/role.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/modules/community/guild/domain/guild.repository.interface';
import { assertCanManagePosition, resolveRoleActor } from './role-hierarchy';

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
  ) {}

  async execute(
    roleId: string,
    guildId: string,
    actorId: string,
  ): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role || role.guildId !== guildId)
      throw new NotFoundException('Role not found');
    if (role.isDefault)
      throw new ForbiddenException('Cannot delete default role');

    const guild = await this.guildRepo.findById(role.guildId);
    if (!guild) throw new NotFoundException('Guild not found');

    const actor = await resolveRoleActor(this.memberRepo, guild, actorId);
    if (!hasPermission(actor.permissions, GuildPermissions.MANAGE_ROLES))
      throw new ForbiddenException();

    assertCanManagePosition(actor, role.position);

    await this.roleRepo.delete(roleId);
  }
}
