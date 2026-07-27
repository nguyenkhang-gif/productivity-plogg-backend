import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GuildPermissions,
  hasPermission,
} from 'src/core/domain/constants/guild-permissions';
import { Message } from 'src/core/domain/entities/message.entity';
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

export interface SendMessageInput {
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  replyToId?: string | null;
}

@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messageRepo: MessageRepository,
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(input: SendMessageInput): Promise<Message> {
    const channel = await this.channelRepo.findById(input.channelId);
    if (!channel) throw new NotFoundException('Channel not found');
    const perms = await this.memberRepo.getResolvedPermissions(
      channel.guildId,
      input.senderId,
    );
    if (!hasPermission(perms, GuildPermissions.SEND_MESSAGES))
      throw new ForbiddenException();

    return this.messageRepo.create({
      channelId: input.channelId,
      senderId: input.senderId,
      senderName: input.senderName,
      senderAvatar: input.senderAvatar,
      replyToId: input.replyToId,
      content: input.content,
    });
  }
}
