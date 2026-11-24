import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GuildPermissions,
  hasPermission,
} from 'src/modules/community/guild/domain/guild-permissions';
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
import { MemberKicked } from 'src/modules/community/guild-member/domain/events/member.events';

@Injectable()
export class KickMemberUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(GUILD_REPOSITORY)
    private readonly guildRepo: GuildRepository,
    @Inject(COMMUNITY_EVENT_PUBLISHER)
    private readonly events: CommunityEventPublisher,
  ) {}

  async execute(
    guildId: string,
    actorId: string,
    targetId: string,
  ): Promise<void> {
    const guild = await this.guildRepo.findById(guildId);
    if (!guild) throw new NotFoundException('Guild not found');
    if (guild.ownerId === targetId)
      throw new ForbiddenException('Cannot kick owner');
    const perms = await this.memberRepo.getResolvedPermissions(
      guildId,
      actorId,
    );
    if (!hasPermission(perms, GuildPermissions.KICK_MEMBERS))
      throw new ForbiddenException();

    if (guild.ownerId !== actorId) {
      const actorPos = await this.memberRepo.getHighestRolePosition(
        guildId,
        actorId,
      );
      const targetPos = await this.memberRepo.getHighestRolePosition(
        guildId,
        targetId,
      );
      if (actorPos <= targetPos)
        throw new ForbiddenException('Insufficient role hierarchy');
    }

    await this.memberRepo.remove(guildId, targetId);
    this.events.publish(new MemberKicked(guildId, targetId, actorId));
  }
}
