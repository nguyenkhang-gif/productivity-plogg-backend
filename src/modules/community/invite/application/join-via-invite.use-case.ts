import {
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GUILD_INVITE_REPOSITORY,
  GuildInviteRepository,
} from 'src/modules/community/invite/domain/guild-invite.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from 'src/modules/community/role/domain/role.repository.interface';

export interface JoinViaInviteInput {
  code: string;
  userId: string;
  username: string;
  avatar?: string | null;
}

@Injectable()
export class JoinViaInviteUseCase {
  constructor(
    @Inject(GUILD_INVITE_REPOSITORY)
    private readonly inviteRepo: GuildInviteRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
  ) {}

  async execute(input: JoinViaInviteInput): Promise<{ guildId: string }> {
    const invite = await this.inviteRepo.findByCode(input.code);
    if (!invite) throw new NotFoundException('Invite not found');

    const guildId = invite.guildId;

    if (await this.memberRepo.isMember(guildId, input.userId)) {
      return { guildId };
    }

    const expired =
      !!invite.expiresAt && invite.expiresAt.getTime() <= Date.now();
    const exhausted = invite.maxUses != null && invite.uses >= invite.maxUses;
    if (expired || exhausted)
      throw new GoneException('Invite is no longer valid');

    const defaultRole = await this.roleRepo.findDefaultByGuild(guildId);
    const result = await this.inviteRepo.joinWithInvite({
      code: input.code,
      guildId,
      userId: input.userId,
      username: input.username,
      avatar: input.avatar ?? null,
      defaultRoleId: defaultRole?.id ?? null,
    });
    if (result === 'unavailable')
      throw new GoneException('Invite is no longer valid');

    return { guildId };
  }
}
