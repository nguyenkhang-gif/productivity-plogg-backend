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
  GUILD_INVITE_REPOSITORY,
  GuildInviteRepository,
} from 'src/modules/community/invite/domain/guild-invite.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';

@Injectable()
export class DeleteInviteUseCase {
  constructor(
    @Inject(GUILD_INVITE_REPOSITORY)
    private readonly inviteRepo: GuildInviteRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(guildId: string, code: string, actorId: string): Promise<void> {
    const invite = await this.inviteRepo.findByCode(code);
    if (!invite || invite.guildId !== guildId)
      throw new NotFoundException('Invite not found');

    if (invite.createdBy !== actorId) {
      const perms = await this.memberRepo.getResolvedPermissions(
        guildId,
        actorId,
      );
      if (!hasPermission(perms, GuildPermissions.MANAGE_GUILD))
        throw new ForbiddenException();
    }

    await this.inviteRepo.delete(code);
  }
}
