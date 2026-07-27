import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Guild } from 'src/core/domain/entities/guild.entity';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/core/domain/repositories/guild.repository.interface';

@Injectable()
export class GetGuildUseCase {
  constructor(
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(guildId: string, userId: string): Promise<Guild> {
    // validate find guild
    const guild = this.guildRepo.findById(guildId);
    if (!guild) throw new NotFoundException('Guild not found');

    // validate  is member

    const isMember = this.memberRepo.isMember(guildId, userId);
    if (!isMember) throw new ForbiddenException('Not a member of this guild');
    // return
    return guild;
  }
}
