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

export interface UpdateChannelData {
  name?: string;
  topic?: string | null;
}

export interface ChannelRepository {
  findByGuild(guildId: string): Promise<Channel[]>;
  findById(id: string): Promise<Channel | null>;
  /** Position lớn nhất trong guild; guild rỗng trả -1 (channel đầu tiên → 0). */
  getMaxPosition(guildId: string): Promise<number>;
  create(data: CreateChannelData): Promise<Channel>;
  update(id: string, data: UpdateChannelData): Promise<Channel>;
  reorder(channelId: string, newPosition: number): Promise<void>;
  /** Gán lại position = index cho toàn bộ channel theo thứ tự orderedIds, trong 1 transaction. */
  reorderBulk(guildId: string, orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
}
