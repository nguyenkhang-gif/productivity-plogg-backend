import { ForbiddenException } from '@nestjs/common';
import {
  DEFAULT_ROLE_FORBIDDEN_PERMISSIONS,
  GuildPermissions,
} from 'src/modules/community/guild/domain/guild-permissions';
import { Guild } from 'src/modules/community/guild/domain/guild.entity';
import { GuildMemberRepository } from 'src/modules/community/guild-member/domain/guild-member.repository.interface';

export interface RoleActor {
  userId: string;
  isOwner: boolean;
  highestPosition: number;
  permissions: bigint;
}

export async function resolveRoleActor(
  memberRepo: GuildMemberRepository,
  guild: Guild,
  actorId: string,
): Promise<RoleActor> {
  if (guild.ownerId === actorId) {
    return {
      userId: actorId,
      isOwner: true,
      highestPosition: Number.POSITIVE_INFINITY,
      permissions: GuildPermissions.ADMINISTRATOR,
    };
  }
  const [permissions, highestPosition] = await Promise.all([
    memberRepo.getRolePermissions(guild.id, actorId),
    memberRepo.getHighestRolePosition(guild.id, actorId),
  ]);
  return { userId: actorId, isOwner: false, highestPosition, permissions };
}

export async function resolveMemberPosition(
  memberRepo: GuildMemberRepository,
  guild: Guild,
  userId: string,
): Promise<number> {
  if (guild.ownerId === userId) return Number.POSITIVE_INFINITY;
  return memberRepo.getHighestRolePosition(guild.id, userId);
}

export function assertCanManagePosition(actor: RoleActor, position: number) {
  if (actor.isOwner) return;
  if (!(position < actor.highestPosition))
    throw new ForbiddenException('Insufficient role hierarchy');
}

export function assertCanManageMember(
  actor: RoleActor,
  targetPosition: number,
) {
  if (actor.isOwner) return;
  if (!(targetPosition < actor.highestPosition))
    throw new ForbiddenException('Insufficient role hierarchy');
}

export function assertCanChangePermissions(
  actor: RoleActor,
  current: bigint,
  next: bigint,
  isDefault: boolean,
) {
  if (isDefault && next & DEFAULT_ROLE_FORBIDDEN_PERMISSIONS)
    throw new ForbiddenException(
      'Default role cannot receive elevated permissions',
    );
  if (actor.isOwner) return;

  const changed = current ^ next;
  if (changed & GuildPermissions.ADMINISTRATOR)
    throw new ForbiddenException('Only the owner can grant ADMINISTRATOR');

  const actorIsAdmin = !!(actor.permissions & GuildPermissions.ADMINISTRATOR);
  if (!actorIsAdmin && changed & ~actor.permissions)
    throw new ForbiddenException('Cannot grant permissions you do not have');
}
