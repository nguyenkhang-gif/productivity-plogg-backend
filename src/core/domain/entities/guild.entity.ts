import { Channel } from './channel.entity';
import { GuildMember } from './guild-member.entity';
import { Role } from './role.entity';

export class Guild {
  id: string;
  name: string;
  icon?: string | null;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;

  channels?: Channel[];
  members?: GuildMember[];
  roles?: Role[];

  constructor(partial: Partial<Guild>) {
    Object.assign(this, partial);
  }
}
