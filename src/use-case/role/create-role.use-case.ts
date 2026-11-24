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
import { Role } from 'src/core/domain/entities/role.entity';
import {
  CreateRoleData,
  ROLE_REPOSITORY,
  RoleRepository,
} from 'src/core/domain/repositories/role.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/core/domain/repositories/guild.repository.interface';
import {
  assertCanChangePermissions,
  assertCanManagePosition,
  resolveRoleActor,
} from './role-hierarchy';

export interface CreateRoleInput {
  guildId: string;
  actorId: string;
  name: string;
  color?: string;
  position?: number;
  permissions: bigint;
}

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
  ) {}

  async execute(input: CreateRoleInput): Promise<Role> {
    const guild = await this.guildRepo.findById(input.guildId);
    if (!guild) throw new NotFoundException('Guild not found');

    const actor = await resolveRoleActor(this.memberRepo, guild, input.actorId);
    if (!hasPermission(actor.permissions, GuildPermissions.MANAGE_ROLES))
      throw new ForbiddenException();

    assertCanManagePosition(actor, input.position ?? 0);
    assertCanChangePermissions(actor, 0n, input.permissions, false);

    const data: CreateRoleData = {
      guildId: input.guildId,
      name: input.name,
      color: input.color,
      position: input.position,
      permissions: input.permissions,
    };
    return this.roleRepo.create(data);
  }
}
