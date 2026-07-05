import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  USER_PROGRESS_REPOSITORY,
  UserProgressRepository,
} from 'src/core/domain/repositories/user-progress.repository.interface';
import { UserProgress } from 'src/core/domain/entities/user-progress.entity';
import { UpdateFocusConfigDto } from 'src/core/dtos/focus.dto';

@Injectable()
export class UpdateFocusConfigUseCase {
  constructor(
    @Inject(USER_PROGRESS_REPOSITORY)
    private readonly progressRepo: UserProgressRepository,
  ) {}

  async execute(
    userId: string,
    dto: UpdateFocusConfigDto,
  ): Promise<UserProgress> {
    if (dto.drinkId === undefined && dto.tzOffset === undefined) {
      throw new BadRequestException('Nothing to update');
    }
    return this.progressRepo.updateConfig(userId, {
      drinkId: dto.drinkId,
      tzOffset: dto.tzOffset,
    });
  }
}
