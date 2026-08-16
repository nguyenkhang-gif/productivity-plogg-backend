import { GuildInvite } from '../entities/guild-invite.entity';

export const GUILD_INVITE_REPOSITORY = 'GUILD_INVITE_REPOSITORY';

export interface CreateInviteData {
  code: string;
  guildId: string;
  createdBy: string;
  maxUses?: number | null;
  expiresAt?: Date | null;
}

export interface GuildInviteRepository {
  create(data: CreateInviteData): Promise<GuildInvite>;
  findByCode(code: string): Promise<GuildInvite | null>;
  incrementUses(code: string): Promise<void>;
  // Full: findByGuild(guildId), delete(code)
}
