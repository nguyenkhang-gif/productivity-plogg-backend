import { safeDisplayName } from 'src/modules/community/message/domain/display-name';
import {
  BadRequestException,
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

    if (input.replyToId) {
      const parent = await this.messageRepo.findById(input.replyToId);
      if (!parent || parent.channelId !== input.channelId)
        throw new BadRequestException('Invalid replyToId');
    }

    const member = await this.memberRepo.findMember(
      channel.guildId,
      input.senderId,
    );
    const senderName = safeDisplayName(
      member?.username,
      safeDisplayName(input.senderName, input.senderId),
    );

    return this.messageRepo.create({
      channelId: input.channelId,
      senderId: input.senderId,
      senderName,
      senderAvatar: input.senderAvatar,
      replyToId: input.replyToId,
      content: input.content,
    });
  }
}
