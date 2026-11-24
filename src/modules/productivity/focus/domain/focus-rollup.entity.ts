export class FocusRollup {
  userId: string;
  /** Daily: "YYYY-MM-DD" · Weekly: week-start "YYYY-MM-DD" · Monthly: "YYYY-MM". */
  periodKey: string;
  sessionsCount: number;
  totalFocusMin: number;
  totalXp: number;

  constructor(partial: Partial<FocusRollup>) {
    Object.assign(this, partial);
  }
}
