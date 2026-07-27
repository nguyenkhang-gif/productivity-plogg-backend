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
  ROLE_REPOSITORY,
  RoleRepository,
  UpdateRoleData,
} from 'src/core/domain/repositories/role.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(
    roleId: string,
    actorId: string,
    data: UpdateRoleData,
  ): Promise<Role> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    const perms = await this.memberRepo.getResolvedPermissions(
      role.guildId,
      actorId,
    );
    if (!hasPermission(perms, GuildPermissions.MANAGE_ROLES))
      throw new ForbiddenException();

    return this.roleRepo.update(roleId, data);
  }
}
