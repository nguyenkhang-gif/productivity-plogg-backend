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
import { Message } from 'src/modules/community/message/domain/message.entity';
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
import { MessageEdited } from 'src/modules/community/message/domain/events/message.events';

@Injectable()
export class EditMessageUseCase {
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
    content: string,
  ): Promise<Message> {
    const message = await this.messageRepo.findById(messageId);
    if (!message || message.channelId !== channelId)
      throw new NotFoundException('Message not found');

    const channel = await this.channelRepo.findById(message.channelId);
    if (!channel) throw new NotFoundException('Channel not found');

    const perms = await this.memberRepo.getResolvedPermissions(
      channel.guildId,
      userId,
    );
    if (!hasPermission(perms, GuildPermissions.SEND_MESSAGES))
      throw new ForbiddenException();

    const updated = await this.messageRepo.edit(
      messageId,
      message.channelId,
      userId,
      content,
    );
    if (!updated)
      throw new ForbiddenException('Not the author or message not found');

    this.events.publish(
      new MessageEdited(
        channel.guildId,
        message.channelId,
        messageId,
        updated.content,
        updated.editedAt,
      ),
    );
    return updated;
  }
}
