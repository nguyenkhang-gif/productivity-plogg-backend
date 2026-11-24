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
  COMMUNITY_EVENT_PUBLISHER,
  CommunityEventPublisher,
} from 'src/modules/community/shared/domain/community-event-publisher';
import { MemberLeft } from 'src/modules/community/guild-member/domain/events/member.events';

@Injectable()
export class LeaveGuildUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly guildMemberRepo: GuildMemberRepository,

    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
    @Inject(COMMUNITY_EVENT_PUBLISHER)
    private readonly events: CommunityEventPublisher,
  ) {}

  async execute(guildId: string, userId: string): Promise<void> {
    const guild = await this.guildRepo.findById(guildId);
    if (!guild) throw new NotFoundException('Guild not found');
    if (guild.ownerId === userId) {
      throw new ForbiddenException('owner cannot leave');
    }
    await this.guildMemberRepo.remove(guildId, userId);
    this.events.publish(new MemberLeft(guildId, userId));
  }
}
