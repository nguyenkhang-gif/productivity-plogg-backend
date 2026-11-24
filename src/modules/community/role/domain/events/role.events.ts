import { Role } from 'src/modules/community/role/domain/role.entity';

export class RoleUpdated {
  static readonly eventName = 'community.role.updated';
  constructor(
    readonly guildId: string,
    readonly role: Role,
  ) {}
}

export class RoleDeleted {
  static readonly eventName = 'community.role.deleted';
  constructor(
    readonly guildId: string,
    readonly roleId: string,
  ) {}
}
