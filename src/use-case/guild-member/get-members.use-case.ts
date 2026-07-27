import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GuildMember } from 'src/core/domain/entities/guild-member.entity';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';

@Injectable()
export class GetMembersUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(
    guildId: string,
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<GuildMember[]> {
    const isMember = await this.memberRepo.isMember(guildId, userId);
    if (!isMember) throw new ForbiddenException('Not a member of this guild');

    return this.memberRepo.findByGuild(guildId, cursor, limit);
  }
}
