import { Inject, Injectable } from '@nestjs/common';
import { Guild } from 'src/core/domain/entities/guild.entity';
import {
  GUILD_MEMBER_REPOSITORY,
  GuildMemberRepository,
} from 'src/core/domain/repositories/guild-member.repository.interface';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/core/domain/repositories/guild.repository.interface';

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

    return guild;
  }
}
