import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
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
export class ReorderChannelsUseCase {
  constructor(
    @Inject(CHANNEL_REPOSITORY) private readonly channelRepo: ChannelRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(
    guildId: string,
    userId: string,
    orderedIds: string[],
  ): Promise<void> {
    const perms = await this.memberRepo.getResolvedPermissions(guildId, userId);
    if (!hasPermission(perms, GuildPermissions.MANAGE_CHANNELS))
      throw new ForbiddenException();

    const channels = await this.channelRepo.findByGuild(guildId);
    const existingIds = channels.map((c) => c.id);

    // orderedIds phải khớp CHÍNH XÁC tập channel của guild (đủ, không thừa,
    // không trùng) — tránh channel bị mất vị trí hoặc chèn id lạ.
    const unique = new Set(orderedIds);
    const sameSize =
      unique.size === orderedIds.length &&
      orderedIds.length === existingIds.length;
    const sameSet = existingIds.every((id) => unique.has(id));
    if (!sameSize || !sameSet)
      throw new BadRequestException(
        'orderedIds phải khớp đúng toàn bộ channel của guild',
      );

    await this.channelRepo.reorderBulk(guildId, orderedIds);
  }
}
