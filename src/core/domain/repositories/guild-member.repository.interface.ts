import { GuildMember } from '../entities/guild-member.entity';

export const GUILD_MEMBER_REPOSITORY = 'GUILD_MEMBER_REPOSITORY';

export interface AddGuildMemberData {
  guildId: string;
  userId: string;
  username: string;
  avatar?: string | null;
  nickname?: string | null;
}

export interface GuildMemberRepository {
  findByGuild(
    guildId: string,
    cursor?: string,
    limit?: number,
  ): Promise<GuildMember[]>;
  findMember(guildId: string, userId: string): Promise<GuildMember | null>;
  isMember(guildId: string, userId: string): Promise<boolean>;
  add(data: AddGuildMemberData): Promise<GuildMember>;
  remove(guildId: string, userId: string): Promise<void>;
  assignRole(guildId: string, userId: string, roleId: string): Promise<void>;
  getResolvedPermissions(guildId: string, userId: string): Promise<bigint>;
  /**
   * OR-gộp permission của mọi role user có trong guild (KHÔNG xét owner).
   * Dùng khi caller đã có guild trong tay và tự xử lý owner → tránh
   * fetch guild lại lần nữa như getResolvedPermissions.
   */
  getRolePermissions(guildId: string, userId: string): Promise<bigint>;
  getHighestRolePosition(guildId: string, userId: string): Promise<number>;
}
