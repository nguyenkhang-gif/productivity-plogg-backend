import { Role } from '../entities/role.entity';

export const ROLE_REPOSITORY = 'ROLE_REPOSITORY';

export interface CreateRoleData {
  guildId: string;
  name: string;
  color?: string;
  position?: number;
  permissions: bigint;
  isDefault?: boolean;
}

export interface RoleRepository {
  create(data: CreateRoleData): Promise<Role>;
  findDefaultByGuild(guildId: string): Promise<Role | null>;
}
