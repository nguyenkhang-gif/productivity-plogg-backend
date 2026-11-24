import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuildPermissions } from 'src/modules/community/guild/domain/guild-permissions';
import { Guild } from 'src/modules/community/guild/domain/guild.entity';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/modules/community/guild-member/domain/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/modules/community/guild/domain/guild.repository.interface';

@Injectable()
export class GetGuildUseCase {
  constructor(
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
  ) {}

  async execute(guildId: string, userId: string): Promise<Guild> {
    // validate find guild
    const guild = await this.guildRepo.findById(guildId);
    if (!guild) throw new NotFoundException('Guild not found');

    // resolve quyền của user hiện tại, tái dùng guild đã fetch (không query guild lần nữa)
    let perms: bigint;
    if (guild.ownerId === userId) {
      perms = GuildPermissions.ADMINISTRATOR; // owner → full quyền, 0 query thêm
    } else {
      const isMember = await this.memberRepo.isMember(guildId, userId);
      if (!isMember) throw new ForbiddenException('Not a member of this guild');
      perms = await this.memberRepo.getRolePermissions(guildId, userId);
    }

    return { ...guild, myPermissions: perms.toString() };
  }
}
