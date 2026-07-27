import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
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
  ) {}

  async execute(input: CreateRoleInput): Promise<Role> {
    const perms = await this.memberRepo.getResolvedPermissions(
      input.guildId,
      input.actorId,
    );
    if (!hasPermission(perms, GuildPermissions.MANAGE_ROLES))
      throw new ForbiddenException();

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
