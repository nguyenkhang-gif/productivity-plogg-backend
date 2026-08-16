import { randomBytes } from 'crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  GuildPermissions,
  hasPermission,
} from 'src/core/domain/constants/guild-permissions';
import {
  GUILD_INVITE_REPOSITORY,
  GuildInviteRepository,
} from 'src/core/domain/repositories/guild-invite.repository.interface';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';

// Code url-safe (base62), 8 ký tự — không thêm dependency (dùng crypto).
const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateCode(len = 8): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

@Injectable()
export class CreateInviteUseCase {
  constructor(
    @Inject(GUILD_INVITE_REPOSITORY)
    private readonly inviteRepo: GuildInviteRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(guildId: string, actorId: string): Promise<{ code: string }> {
    const perms = await this.memberRepo.getResolvedPermissions(
      guildId,
      actorId,
    );
    if (!hasPermission(perms, GuildPermissions.MANAGE_GUILD))
      throw new ForbiddenException();

    const code = generateCode();
    await this.inviteRepo.create({ code, guildId, createdBy: actorId });
    return { code };
  }
}
