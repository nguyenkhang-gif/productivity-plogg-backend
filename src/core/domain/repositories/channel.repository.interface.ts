import { Channel, ChannelType } from '../entities/channel.entity';

export const CHANNEL_REPOSITORY = 'CHANNEL_REPOSITORY';

export interface CreateChannelData {
  guildId: string;
  parentId?: string | null;
  type?: ChannelType;
  name: string;
  topic?: string | null;
  position?: number;
}

export interface ChannelRepository {
  findByGuild(guildId: string): Promise<Channel[]>;
  findById(id: string): Promise<Channel | null>;
  create(data: CreateChannelData): Promise<Channel>;
  reorder(channelId: string, newPosition: number): Promise<void>;
  delete(id: string): Promise<void>;
}
