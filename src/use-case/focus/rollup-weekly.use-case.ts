import { Inject, Injectable } from '@nestjs/common';
import {
  FOCUS_SESSION_REPOSITORY,
  FocusSessionRepository,
} from 'src/core/domain/repositories/focus-session.repository.interface';
import { addDays, localDateFor } from './focus-date.util';

@Injectable()
export class RollupWeeklyUseCase {
  constructor(
    @Inject(FOCUS_SESSION_REPOSITORY)
    private readonly sessionRepo: FocusSessionRepository,
  ) {}

  /** Rolls up the previous ISO week (Mon–Sun) from daily docs. */
  async execute(
    ref: Date = new Date(),
  ): Promise<{ weekStart: string; weekEnd: string }> {
    const today = localDateFor(ref, 0);
    // getUTCDay(): Sunday = 0 → distance back to this week's Monday
    const dayOfWeek = new Date(`${today}T00:00:00Z`).getUTCDay();
    const thisMonday = addDays(today, -((dayOfWeek + 6) % 7));
    const weekStart = addDays(thisMonday, -7);
    const weekEnd = addDays(thisMonday, -1);
    await this.sessionRepo.rollupWeekly(weekStart, weekEnd);
    return { weekStart, weekEnd };
  }
}
