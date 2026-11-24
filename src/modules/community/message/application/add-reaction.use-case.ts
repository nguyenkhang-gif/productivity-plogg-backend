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
  MESSAGE_REPOSITORY,
  MessageRepository,
} from 'src/modules/community/message/domain/message.repository.interface';
import {
  COMMUNITY_EVENT_PUBLISHER,
  CommunityEventPublisher,
} from 'src/modules/community/shared/domain/community-event-publisher';
import { ReactionChanged } from 'src/modules/community/message/domain/events/message.events';

@Injectable()
export class AddReactionUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messageRepo: MessageRepository,
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(COMMUNITY_EVENT_PUBLISHER)
    private readonly events: CommunityEventPublisher,
  ) {}

  async execute(
    messageId: string,
    channelId: string,
    userId: string,
    emoji: string,
  ): Promise<{ channelId: string }> {
    const message = await this.messageRepo.findById(messageId);
    if (!message || message.isDeleted || message.channelId !== channelId)
      throw new NotFoundException('Message not found');

    const channel = await this.channelRepo.findById(message.channelId);
    if (!channel) throw new NotFoundException('Channel not found');

    const perms = await this.memberRepo.getResolvedPermissions(
      channel.guildId,
      userId,
    );
    if (!hasPermission(perms, GuildPermissions.VIEW_CHANNELS))
      throw new ForbiddenException();

    await this.messageRepo.addReaction(messageId, userId, emoji);
    this.events.publish(
      new ReactionChanged(
        channel.guildId,
        message.channelId,
        messageId,
        emoji,
        userId,
      ),
    );
    return { channelId: message.channelId };
  }
}
