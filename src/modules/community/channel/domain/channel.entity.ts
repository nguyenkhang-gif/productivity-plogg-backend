export type ChannelType = 'TEXT' | 'CATEGORY';

export class Channel {
  id: string;
  guildId: string;
  parentId?: string | null;
  type: ChannelType;
  name: string;
  topic?: string | null;
  position: number;
  createdAt?: Date;

  constructor(partial: Partial<Channel>) {
    Object.assign(this, partial);
  }
}
