import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GuildPermissions,
  hasPermission,
} from 'src/modules/community/guild/domain/guild-permissions';
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
import { ChannelDeleted } from 'src/modules/community/channel/domain/events/channel.events';

@Injectable()
export class DeleteChannelUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(COMMUNITY_EVENT_PUBLISHER)
    private readonly events: CommunityEventPublisher,
  ) {}

  async execute(channelId: string, userId: string): Promise<void> {
    const channel = await this.channelRepo.findById(channelId);
    if (!channel) throw new NotFoundException('channel not found');

    const perms = await this.memberRepo.getResolvedPermissions(
      channel.guildId,
      userId,
    );
    if (!hasPermission(perms, GuildPermissions.MANAGE_CHANNELS))
      throw new ForbiddenException();

    await this.channelRepo.delete(channelId);
    this.events.publish(new ChannelDeleted(channel.guildId, channelId));
  }
}
