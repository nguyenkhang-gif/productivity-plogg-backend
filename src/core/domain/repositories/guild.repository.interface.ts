import { Guild } from '../entities/guild.entity';

export const GUILD_REPOSITORY = 'GUILD_REPOSITORY';

export interface CreateGuildData {
  name: string;
  icon?: string | null;
  ownerId: string;
}

export interface GuildRepository {
  findById(id: string): Promise<Guild | null>;
  findByMember(userId: string): Promise<Guild[]>;
  create(data: CreateGuildData): Promise<Guild>;
  delete(id: string): Promise<void>;
}
