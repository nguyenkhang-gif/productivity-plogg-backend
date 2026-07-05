import { FocusSession } from '../entities/focus-session.entity';

export const FOCUS_SESSION_REPOSITORY = 'FOCUS_SESSION_REPOSITORY';

/** Thrown when a clientSessionId was already recorded for this user. */
export class DuplicateSessionError extends Error {
  constructor(clientSessionId: string) {
    super(`Session already recorded: ${clientSessionId}`);
    this.name = 'DuplicateSessionError';
  }
}

export interface FocusSessionRepository {
  insertRaw(session: FocusSession): Promise<FocusSession>;
  /** Aggregates raw sessions for the given localDates into daily docs ($merge, idempotent). */
  rollupDaily(localDates: string[]): Promise<void>;
  /** Aggregates daily docs in [weekStart, weekEnd] into one weekly doc per user. */
  rollupWeekly(weekStart: string, weekEnd: string): Promise<void>;
  /** Aggregates daily docs of month "YYYY-MM" into one monthly doc per user. */
  rollupMonthly(month: string): Promise<void>;
}
