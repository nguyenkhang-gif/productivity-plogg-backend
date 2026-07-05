import { Inject, Injectable } from '@nestjs/common';
import {
  FOCUS_SESSION_REPOSITORY,
  FocusSessionRepository,
} from 'src/core/domain/repositories/focus-session.repository.interface';
import { addDays, localDateFor } from './focus-date.util';

@Injectable()
export class RollupDailyUseCase {
  constructor(
    @Inject(FOCUS_SESSION_REPOSITORY)
    private readonly sessionRepo: FocusSessionRepository,
  ) {}

  /**
   * Re-rolls the last 3 local dates (or an explicit list for backfill).
   * The 3-day window covers timezone stragglers and self-heals a missed
   * run — $merge with whenMatched: replace makes re-runs idempotent.
   */
  async execute(dates?: string[]): Promise<string[]> {
    const targets =
      dates ?? [1, 2, 3].map((i) => addDays(localDateFor(new Date(), 0), -i));
    await this.sessionRepo.rollupDaily(targets);
    return targets;
  }
}
