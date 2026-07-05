import { Inject, Injectable } from '@nestjs/common';
import {
  FOCUS_SESSION_REPOSITORY,
  FocusSessionRepository,
} from 'src/core/domain/repositories/focus-session.repository.interface';

@Injectable()
export class RollupMonthlyUseCase {
  constructor(
    @Inject(FOCUS_SESSION_REPOSITORY)
    private readonly sessionRepo: FocusSessionRepository,
  ) {}

  /** Rolls up the previous calendar month ("YYYY-MM") from daily docs. */
  async execute(ref: Date = new Date()): Promise<string> {
    const prev = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1),
    );
    const month = prev.toISOString().slice(0, 7);
    await this.sessionRepo.rollupMonthly(month);
    return month;
  }
}
