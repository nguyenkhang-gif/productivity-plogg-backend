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

    return this.channelRepo.create({
      guildId: input.guildId,
      name: input.name,
      type: input.type,
      parentId: input.parentId,
      topic: input.topic,
      position: maxPosition + 1,
    });
  }
}
