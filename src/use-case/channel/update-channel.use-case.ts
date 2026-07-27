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
import { Channel } from 'src/core/domain/entities/channel.entity';
import {
  CHANNEL_REPOSITORY,
  ChannelRepository,
  UpdateChannelData,
} from 'src/core/domain/repositories/channel.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';

@Injectable()
export class UpdateChannelUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(
    channelId: string,
    userId: string,
    data: UpdateChannelData,
  ): Promise<Channel> {
    const channel = await this.channelRepo.findById(channelId);
    if (!channel) throw new NotFoundException('Channel not found');

    const perms = await this.memberRepo.getResolvedPermissions(
      channel.guildId,
      userId,
    );
    if (!hasPermission(perms, GuildPermissions.MANAGE_CHANNELS))
      throw new ForbiddenException();

    return this.channelRepo.update(channelId, data);
  }
}
