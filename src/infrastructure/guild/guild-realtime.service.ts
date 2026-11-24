import { Inject, Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  CHANNEL_REPOSITORY,
  ChannelRepository,
} from 'src/core/domain/repositories/channel.repository.interface';
import { GuildRealtime } from './guild-realtime.interface';

@Injectable()
export class GuildRealtimeService implements GuildRealtime {
  private readonly logger = new Logger(GuildRealtimeService.name);
  private server?: Pick<Server, 'in'>;

  constructor(
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
  ) {}

  setServer(server: Pick<Server, 'in'>) {
    this.server = server;
  }

  async evictFromGuild(userId: string, guildId: string): Promise<void> {
    if (!this.server) return;
    try {
      const channels = await this.channelRepo.findByGuild(guildId);
      const rooms = [
        `guild:${guildId}`,
        ...channels.map((c) => `channel:${c.id}`),
      ];
      this.server.in(`user:${userId}`).socketsLeave(rooms);
    } catch (e) {
      this.logger.warn(`evictFromGuild failed: ${(e as Error).message}`);
    }
  }
}
