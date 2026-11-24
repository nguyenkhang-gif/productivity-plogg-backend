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
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/modules/community/guild/domain/guild.repository.interface';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from 'src/modules/community/role/domain/role.repository.interface';
import {
  assertCanManageMember,
  assertCanManagePosition,
  resolveMemberPosition,
  resolveRoleActor,
} from 'src/modules/community/role/application/role-hierarchy';
import {
  COMMUNITY_EVENT_PUBLISHER,
  CommunityEventPublisher,
} from 'src/modules/community/shared/domain/community-event-publisher';
import { MemberRolesChanged } from 'src/modules/community/guild-member/domain/events/member.events';

@Injectable()
export class AssignRoleUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(COMMUNITY_EVENT_PUBLISHER)
    private readonly events: CommunityEventPublisher,
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

    if (!(await this.memberRepo.isMember(guildId, targetId)))
      throw new NotFoundException('Member not found');

    assertCanManagePosition(actor, role.position);
    assertCanManageMember(
      actor,
      await resolveMemberPosition(this.memberRepo, guild, targetId),
    );

    await this.memberRepo.assignRole(guildId, targetId, roleId);
    this.events.publish(
      new MemberRolesChanged(guildId, targetId, roleId, 'assigned'),
    );
  }
}
