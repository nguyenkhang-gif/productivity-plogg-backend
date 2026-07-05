import { Inject, Injectable } from '@nestjs/common';
import {
  USER_PROGRESS_REPOSITORY,
  UserProgressRepository,
} from 'src/core/domain/repositories/user-progress.repository.interface';
import { UserProgress } from 'src/core/domain/entities/user-progress.entity';
import { addDays, localDateFor } from './focus-date.util';

@Injectable()
export class GetFocusProgressUseCase {
  constructor(
    @Inject(USER_PROGRESS_REPOSITORY)
    private readonly progressRepo: UserProgressRepository,
  ) {}

  async execute(userId: string): Promise<UserProgress> {
    const existing = await this.progressRepo.findByUserId(userId);
    const progress =
      existing ??
      new UserProgress({
        userId,
        totalXp: 0,
        totalFocusMin: 0,
        tzOffset: 0,
        todayCount: 0,
        todayFocusMin: 0,
        currentStreak: 0,
        longestStreak: 0,
      });

    // Stored today/streak fields go stale once the user's local day rolls
    // over — adjust for display without writing anything back
    const today = localDateFor(new Date(), progress.tzOffset ?? 0);
    if (progress.lastActiveLocalDate !== today) {
      progress.todayCount = 0;
      progress.todayFocusMin = 0;
      if (progress.lastActiveLocalDate !== addDays(today, -1)) {
        progress.currentStreak = 0;
      }
    }

    return progress;
  }
}
