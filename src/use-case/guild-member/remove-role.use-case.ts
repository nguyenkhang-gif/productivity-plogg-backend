import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GuildPermissions,
  hasPermission,
} from 'src/core/domain/constants/guild-permissions';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/core/domain/repositories/guild.repository.interface';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from 'src/core/domain/repositories/role.repository.interface';
import {
  assertCanManageMember,
  assertCanManagePosition,
  resolveMemberPosition,
  resolveRoleActor,
} from 'src/use-case/role/role-hierarchy';

@Injectable()
export class RemoveRoleUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
  ) {}

  async execute(
    guildId: string,
    actorId: string,
    targetId: string,
    roleId: string,
  ): Promise<void> {
    const guild = await this.guildRepo.findById(guildId);
    if (!guild) throw new NotFoundException('Guild not found');

    const actor = await resolveRoleActor(this.memberRepo, guild, actorId);
    if (!hasPermission(actor.permissions, GuildPermissions.MANAGE_ROLES))
      throw new ForbiddenException();

    const role = await this.roleRepo.findById(roleId);
    if (!role || role.guildId !== guildId)
      throw new NotFoundException('Role not found');

    assertCanManagePosition(actor, role.position);
    assertCanManageMember(
      actor,
      await resolveMemberPosition(this.memberRepo, guild, targetId),
    );

    await this.memberRepo.removeRole(guildId, targetId, roleId);
  }
}
