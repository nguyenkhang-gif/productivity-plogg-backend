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
import { Guild } from 'src/modules/community/guild/domain/guild.entity';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/modules/community/guild/domain/guild.repository.interface';

export interface UpdateGuildData {
  name?: string;
  icon?: string | null;
}

@Injectable()
export class UpdateGuildUseCase {
  constructor(
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(
    guildId: string,
    userId: string,
    data: UpdateGuildData,
  ): Promise<Guild> {
    // check guilde esist
    const guild = await this.guildRepo.findById(guildId);
    if (!guild) throw new NotFoundException('Guild not found');

    // check perms
    const perms = await this.memberRepo.getResolvedPermissions(guildId, userId);
    if (!hasPermission(perms, GuildPermissions.MANAGE_GUILD))
      throw new ForbiddenException();

    return this.guildRepo.update(guildId, data);
    // return guild
  }
}
