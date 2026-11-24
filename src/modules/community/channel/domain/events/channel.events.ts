import { Channel } from 'src/modules/community/channel/domain/channel.entity';

export class ChannelCreated {
  static readonly eventName = 'community.channel.created';
  constructor(
    readonly guildId: string,
    readonly channel: Channel,
  ) {}
}

export class ChannelUpdated {
  static readonly eventName = 'community.channel.updated';
  constructor(
    readonly guildId: string,
    readonly channel: Channel,
  ) {}
}

export class ChannelDeleted {
  static readonly eventName = 'community.channel.deleted';
  constructor(
    readonly guildId: string,
    readonly channelId: string,
  ) {}
}
