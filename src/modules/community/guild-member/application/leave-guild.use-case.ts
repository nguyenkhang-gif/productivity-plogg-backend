import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/modules/community/guild/domain/guild.repository.interface';
import {
  GUILD_REALTIME,
  GuildRealtime,
} from 'src/modules/community/realtime/domain/guild-realtime.interface';

@Injectable()
export class LeaveGuildUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly guildMemberRepo: GuildMemberRepository,

    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
    @Inject(GUILD_REALTIME) private readonly realtime: GuildRealtime,
  ) {}

  async execute(guildId: string, userId: string): Promise<void> {
    const guild = await this.guildRepo.findById(guildId);
    if (!guild) throw new NotFoundException('Guild not found');
    if (guild.ownerId === userId) {
      throw new ForbiddenException('owner cannot leave');
    }
    await this.guildMemberRepo.remove(guildId, userId);
    await this.realtime.evictFromGuild(userId, guildId);
  }
}
