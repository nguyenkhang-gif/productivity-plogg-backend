import { Inject, Injectable } from '@nestjs/common';
import { Guild } from 'src/core/domain/entities/guild.entity';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/core/domain/repositories/guild.repository.interface';

@Injectable()
export class GetMyGuildsUseCase {
  constructor(
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
  ) {}

  async execute(userId: string): Promise<Guild[]> {
    return this.guildRepo.findByMember(userId);
  }
}
