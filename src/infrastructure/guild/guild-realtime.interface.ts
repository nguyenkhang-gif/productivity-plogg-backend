export const GUILD_REALTIME = 'GUILD_REALTIME';

export interface GuildRealtime {
  evictFromGuild(userId: string, guildId: string): Promise<void>;
}
