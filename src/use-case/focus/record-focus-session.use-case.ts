import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  USER_PROGRESS_REPOSITORY,
  UserProgressRepository,
} from 'src/core/domain/repositories/user-progress.repository.interface';
import {
  DuplicateSessionError,
  FOCUS_SESSION_REPOSITORY,
  FocusSessionRepository,
} from 'src/core/domain/repositories/focus-session.repository.interface';
import { UserProgress } from 'src/core/domain/entities/user-progress.entity';
import { FocusSession } from 'src/core/domain/entities/focus-session.entity';
import { CreateFocusSessionDto } from 'src/core/dtos/focus.dto';
import { addDays, localDateFor } from './focus-date.util';

// XP is computed server-side (1 XP per focus minute) — the client never sends it
const XP_PER_MINUTE = 1;
const MAX_DAILY_FOCUS_MIN = 1440;

export interface RecordSessionResult {
  alreadyRecorded: boolean;
  progress: UserProgress;
}

@Injectable()
export class RecordFocusSessionUseCase {
  constructor(
    @Inject(USER_PROGRESS_REPOSITORY)
    private readonly progressRepo: UserProgressRepository,
    @Inject(FOCUS_SESSION_REPOSITORY)
    private readonly sessionRepo: FocusSessionRepository,
  ) {}

  async execute(
    userId: string,
    dto: CreateFocusSessionDto,
  ): Promise<RecordSessionResult> {
    const existing = await this.progressRepo.findByUserId(userId);
    const tzOffset = dto.tzOffset ?? existing?.tzOffset ?? 0;
    const now = new Date();
    const localDate = localDateFor(now, tzOffset);
    const sameDay = existing?.lastActiveLocalDate === localDate;

    const todayFocusMin =
      (sameDay ? existing.todayFocusMin : 0) + dto.durationMin;
    if (todayFocusMin > MAX_DAILY_FOCUS_MIN) {
      throw new BadRequestException('Daily focus minutes limit exceeded');
    }

    const xpEarned = dto.durationMin * XP_PER_MINUTE;

    try {
      await this.sessionRepo.insertRaw(
        new FocusSession({
          userId,
          clientSessionId: dto.clientSessionId,
          completedAt: now,
          localDate,
          durationMin: dto.durationMin,
          xpEarned,
        }),
      );
    } catch (err) {
      if (err instanceof DuplicateSessionError) {
        return {
          alreadyRecorded: true,
          progress: existing ?? this.emptyProgress(userId, tzOffset),
        };
      }
      throw err;
    }

    let currentStreak: number;
    if (sameDay) {
      currentStreak = existing.currentStreak || 1;
    } else if (existing?.lastActiveLocalDate === addDays(localDate, -1)) {
      currentStreak = existing.currentStreak + 1;
    } else {
      currentStreak = 1;
    }
    const longestStreak = Math.max(currentStreak, existing?.longestStreak ?? 0);

    const progress = await this.progressRepo.applySession(userId, {
      xp: xpEarned,
      focusMin: dto.durationMin,
      localDate,
      tzOffset,
      todayCount: (sameDay ? existing.todayCount : 0) + 1,
      todayFocusMin,
      currentStreak,
      longestStreak,
    });

    return { alreadyRecorded: false, progress };
  }

  private emptyProgress(userId: string, tzOffset: number): UserProgress {
    return new UserProgress({
      userId,
      totalXp: 0,
      totalFocusMin: 0,
      tzOffset,
      todayCount: 0,
      todayFocusMin: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
  }
}
