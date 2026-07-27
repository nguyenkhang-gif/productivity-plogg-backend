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

export interface UpdateRoleData {
  name?: string;
  color?: string;
  position?: number;
  permissions?: bigint;
}

export interface RoleRepository {
  create(data: CreateRoleData): Promise<Role>;
  findById(id: string): Promise<Role | null>;
  findByGuild(guildId: string): Promise<Role[]>;
  findDefaultByGuild(guildId: string): Promise<Role | null>;
  update(id: string, data: UpdateRoleData): Promise<Role>;
  delete(id: string): Promise<void>;
}
