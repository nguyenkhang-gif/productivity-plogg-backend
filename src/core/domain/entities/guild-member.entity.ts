import { Role } from './role.entity';

export class GuildMember {
  guildId: string;
  userId: string;
  username: string;
  avatar?: string | null;
  nickname?: string | null;
  joinedAt?: Date;

  roles?: Role[];

  constructor(partial: Partial<GuildMember>) {
    Object.assign(this, partial);
  }
}
