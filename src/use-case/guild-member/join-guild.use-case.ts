import { Inject, Injectable } from '@nestjs/common';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';

export interface JoinGuildInput {
  guildId: string;
  userId: string;
  username: string;
  avatar: string | null;
}

@Injectable()
export class JoinGuildUseCase {
  constructor(
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(input: JoinGuildInput) {
    const already = await this.memberRepo.isMember(input.guildId, input.userId);
    if (already) return;
    return this.memberRepo.add(input);
  }
}
