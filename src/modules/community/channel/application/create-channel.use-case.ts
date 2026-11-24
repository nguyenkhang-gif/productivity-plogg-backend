import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  GuildPermissions,
  hasPermission,
} from 'src/modules/community/guild/domain/guild-permissions';
import { Channel } from 'src/modules/community/channel/domain/channel.entity';
import {
  CHANNEL_REPOSITORY,
  ChannelRepository,
} from 'src/modules/community/channel/domain/channel.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  COMMUNITY_EVENT_PUBLISHER,
  CommunityEventPublisher,
} from 'src/modules/community/shared/domain/community-event-publisher';
import { ChannelCreated } from 'src/modules/community/channel/domain/events/channel.events';

export interface CreateChannelInput {
  guildId: string;
  actorId: string;
  name: string;
  type?: 'TEXT' | 'CATEGORY';
  parentId?: string | null;
  topic?: string | null;
}

@Injectable()
export class CreateChannelUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(COMMUNITY_EVENT_PUBLISHER)
    private readonly events: CommunityEventPublisher,
  ) {}

  async execute(input: CreateChannelInput): Promise<Channel> {
    const perms = await this.memberRepo.getResolvedPermissions(
      input.guildId,
      input.actorId,
    );

    if (!hasPermission(perms, GuildPermissions.MANAGE_CHANNELS))
      throw new ForbiddenException();

    // Channel mới xuống cuối: position = max hiện có + 1 (guild rỗng → 0).
    const maxPosition = await this.channelRepo.getMaxPosition(input.guildId);

    const channel = await this.channelRepo.create({
      guildId: input.guildId,
      name: input.name,
      type: input.type,
      parentId: input.parentId,
      topic: input.topic,
      position: maxPosition + 1,
    });
    this.events.publish(new ChannelCreated(channel.guildId, channel));
    return channel;
  }
}
