export class UserProgress {
  id: string;
  userId: string;
  totalXp: number;
  totalFocusMin: number;
  drinkId?: string;
  /** Minutes east of UTC (e.g. Vietnam = +420). */
  tzOffset: number;
  todayCount: number;
  todayFocusMin: number;
  /** "YYYY-MM-DD" in the user's timezone. */
  lastActiveLocalDate?: string;
  currentStreak: number;
  longestStreak: number;
  updatedAt?: Date;

  constructor(partial: Partial<UserProgress>) {
    Object.assign(this, partial);
  }
}
