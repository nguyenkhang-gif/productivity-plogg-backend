import { UserProgress } from '../entities/user-progress.entity';

export const USER_PROGRESS_REPOSITORY = 'USER_PROGRESS_REPOSITORY';

/** Final field values for one recorded session — computed by the use-case. */
export interface SessionDelta {
  xp: number;
  focusMin: number;
  localDate: string;
  tzOffset: number;
  todayCount: number;
  todayFocusMin: number;
  currentStreak: number;
  longestStreak: number;
}

export interface FocusConfigPatch {
  drinkId?: string;
  tzOffset?: number;
}

export interface UserProgressRepository {
  findByUserId(userId: string): Promise<UserProgress | null>;
  applySession(userId: string, delta: SessionDelta): Promise<UserProgress>;
  updateConfig(userId: string, patch: FocusConfigPatch): Promise<UserProgress>;
}
