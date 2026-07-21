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
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/core/domain/repositories/guild.repository.interface';

@Injectable()
export class KickMemberUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(GUILD_REPOSITORY)
    private readonly guildRepo: GuildRepository,
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
  }
}
