import { GuildInvite } from './guild-invite.entity';

export const GUILD_INVITE_REPOSITORY = 'GUILD_INVITE_REPOSITORY';

export interface CreateInviteData {
  code: string;
  guildId: string;
  createdBy: string;
  maxUses?: number | null;
  expiresAt?: Date | null;
}

export interface JoinWithInviteData {
  code: string;
  guildId: string;
  userId: string;
  username: string;
  avatar?: string | null;
  defaultRoleId?: string | null;
}

export type JoinWithInviteResult = 'joined' | 'unavailable' | 'already_member';

export interface GuildInviteRepository {
  create(data: CreateInviteData): Promise<GuildInvite>;
  findByCode(code: string): Promise<GuildInvite | null>;
  joinWithInvite(data: JoinWithInviteData): Promise<JoinWithInviteResult>;
  delete(code: string): Promise<void>;
}
