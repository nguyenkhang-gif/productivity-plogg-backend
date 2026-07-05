export class FocusSession {
  id: string;
  userId: string;
  clientSessionId: string;
  completedAt: Date;
  /** "YYYY-MM-DD" in the user's timezone, computed at ingest. */
  localDate: string;
  durationMin: number;
  xpEarned: number;

  constructor(partial: Partial<FocusSession>) {
    Object.assign(this, partial);
  }
}
