import { Inject, Injectable } from '@nestjs/common';
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
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from 'src/modules/community/role/domain/role.repository.interface';

export interface CreateGuildInput {
  ownerId: string;
  ownerUsername: string;
  ownerAvatar?: string | null;
  name: string;
  icon?: string | null;
}

@Injectable()
export class CreateGuildUseCase {
  constructor(
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
    @Inject(GUILD_MEMBER_REPOSITORY)
    private readonly memberRepo: GuildMemberRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepository,
  ) {}

  async execute(input: CreateGuildInput): Promise<Guild> {
    const guild = await this.guildRepo.create({
      name: input.name,
      icon: input.icon,
      ownerId: input.ownerId,
    });

    await this.memberRepo.add({
      guildId: guild.id,
      userId: input.ownerId,
      username: input.ownerUsername,
      avatar: input.ownerAvatar,
    });

    await this.roleRepo.create({
      guildId: guild.id,
      name: '@everyone',
      permissions:
        GuildPermissions.VIEW_CHANNELS | GuildPermissions.SEND_MESSAGES,
      isDefault: true,
      position: 0,
    });

    return guild;
  }
}
