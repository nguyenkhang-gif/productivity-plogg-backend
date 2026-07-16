import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Channel } from 'src/core/domain/entities/channel.entity';
import {
  CHANNEL_REPOSITORY,
  ChannelRepository,
} from 'src/core/domain/repositories/channel.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';

@Injectable()
export class GetChannelsUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(guildId: string, userId: string): Promise<Channel[]> {
    const isMember = await this.memberRepo.isMember(guildId, userId);
    if (!isMember) throw new ForbiddenException('Not a member of this guild');

    return this.channelRepo.findByGuild(guildId);
  }
}
