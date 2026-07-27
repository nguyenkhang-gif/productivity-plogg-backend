import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GUILD_REPOSITORY,
  GuildRepository,
} from 'src/core/domain/repositories/guild.repository.interface';

@Injectable()
export class DeleteGuildUseCase {
  constructor(
    @Inject(GUILD_REPOSITORY) private readonly guildRepo: GuildRepository,
  ) {}

  async execute(guildId: string, userId: string): Promise<void> {
    const guild = await this.guildRepo.findById(guildId);
    if (!guild) throw new NotFoundException('Guild not found');

    if (guild.ownerId !== userId) throw new ForbiddenException('not owner');

    await this.guildRepo.delete(guildId);
  }
}
