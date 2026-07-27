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
import {
  CHANNEL_REPOSITORY,
  ChannelRepository,
} from 'src/core/domain/repositories/channel.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';

@Injectable()
export class DeleteChannelUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
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
  }
}
