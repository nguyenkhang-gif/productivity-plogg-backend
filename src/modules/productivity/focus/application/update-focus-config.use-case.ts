import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  USER_PROGRESS_REPOSITORY,
  UserProgressRepository,
} from 'src/modules/productivity/focus/domain/user-progress.repository.interface';
import { UserProgress } from 'src/modules/productivity/focus/domain/user-progress.entity';
import { UpdateFocusConfigDto } from 'src/modules/productivity/focus/application/dto/focus.dto';

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
