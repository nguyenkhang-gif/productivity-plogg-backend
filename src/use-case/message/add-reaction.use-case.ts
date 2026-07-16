import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuildPermissions } from 'src/core/domain/constants/guild-permissions';
import {
  CHANNEL_REPOSITORY,
  ChannelRepository,
} from 'src/core/domain/repositories/channel.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from 'src/core/domain/repositories/message.repository.interface';

@Injectable()
export class AddReactionUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messageRepo: MessageRepository,
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(
    messageId: string,
    channelId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    const channel = await this.channelRepo.findById(channelId);
    if (!channel) throw new NotFoundException('Channel not found');

    const perms = await this.memberRepo.getResolvedPermissions(
      channel.guildId,
      userId,
    );
    if (!(perms & GuildPermissions.VIEW_CHANNELS))
      throw new ForbiddenException();

    await this.messageRepo.addReaction(messageId, userId, emoji);
  }
}
