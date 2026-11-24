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
import { Role } from 'src/modules/community/role/domain/role.entity';
import {
  ROLE_REPOSITORY,
  RoleRepository,
  UpdateRoleData,
} from 'src/modules/community/role/domain/role.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/modules/community/guild/domain/guild.repository.interface';
import {
  assertCanChangePermissions,
  assertCanManagePosition,
  resolveRoleActor,
} from './role-hierarchy';

@Injectable()
export class UpdateRoleUseCase {
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
    data: UpdateRoleData,
  ): Promise<Role> {
    const role = await this.roleRepo.findById(roleId);
    if (!role || role.guildId !== guildId)
      throw new NotFoundException('Role not found');

    const guild = await this.guildRepo.findById(role.guildId);
    if (!guild) throw new NotFoundException('Guild not found');

    const actor = await resolveRoleActor(this.memberRepo, guild, actorId);
    if (!hasPermission(actor.permissions, GuildPermissions.MANAGE_ROLES))
      throw new ForbiddenException();

    assertCanManagePosition(actor, role.position);
    if (data.position !== undefined)
      assertCanManagePosition(actor, data.position);
    assertCanChangePermissions(
      actor,
      role.permissions,
      data.permissions ?? role.permissions,
      role.isDefault,
    );

    return this.roleRepo.update(roleId, data);
  }
}
