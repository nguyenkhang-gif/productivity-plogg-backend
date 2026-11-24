import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import {
  FocusConfigPatch,
  SessionDelta,
  UserProgressRepository,
} from 'src/modules/productivity/focus/domain/user-progress.repository.interface';
import { UserProgress as UserProgressEntity } from 'src/modules/productivity/focus/domain/user-progress.entity';

interface ProgressRow {
  id: string;
  userId: string;
  totalXp: number;
  totalFocusMin: number;
  drinkId: string | null;
  tzOffset: number;
  todayCount: number;
  todayFocusMin: number;
  lastActiveLocalDate: string | null;
  currentStreak: number;
  longestStreak: number;
  updatedAt: Date;
}

@Injectable()
export class PrismaUserProgressRepository implements UserProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: ProgressRow): UserProgressEntity {
    return new UserProgressEntity({
      id: row.id,
      userId: row.userId,
      totalXp: row.totalXp,
      totalFocusMin: row.totalFocusMin,
      drinkId: row.drinkId ?? undefined,
      tzOffset: row.tzOffset,
      todayCount: row.todayCount,
      todayFocusMin: row.todayFocusMin,
      lastActiveLocalDate: row.lastActiveLocalDate ?? undefined,
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      updatedAt: row.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<UserProgressEntity | null> {
    const row = await this.prisma.userProgress.findUnique({
      where: { userId },
    });
    return row ? this.mapToDomain(row) : null;
  }

  /**
   * Single upsert statement: totals are incremented in the database
   * (`total = total + EXCLUDED.total`), so parallel recordings never lose
   * updates; the remaining fields are overwritten like Mongo's `$set`.
   */
  async applySession(
    userId: string,
    delta: SessionDelta,
  ): Promise<UserProgressEntity> {
    const rows = await this.prisma.$queryRaw<ProgressRow[]>`
      INSERT INTO user_progress
        ("id", "userId", "totalXp", "totalFocusMin", "tzOffset", "todayCount",
         "todayFocusMin", "lastActiveLocalDate", "currentStreak", "longestStreak",
         "createdAt", "updatedAt")
      VALUES
        (${newObjectId()}, ${userId}, ${delta.xp}, ${delta.focusMin}, ${delta.tzOffset},
         ${delta.todayCount}, ${delta.todayFocusMin}, ${delta.localDate},
         ${delta.currentStreak}, ${delta.longestStreak},
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO UPDATE SET
        "totalXp" = user_progress."totalXp" + EXCLUDED."totalXp",
        "totalFocusMin" = user_progress."totalFocusMin" + EXCLUDED."totalFocusMin",
        "tzOffset" = EXCLUDED."tzOffset",
        "todayCount" = EXCLUDED."todayCount",
        "todayFocusMin" = EXCLUDED."todayFocusMin",
        "lastActiveLocalDate" = EXCLUDED."lastActiveLocalDate",
        "currentStreak" = EXCLUDED."currentStreak",
        "longestStreak" = EXCLUDED."longestStreak",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *`;
    return this.mapToDomain(rows[0]);
  }

  async updateConfig(
    userId: string,
    patch: FocusConfigPatch,
  ): Promise<UserProgressEntity> {
    const drinkId = patch.drinkId ?? null;
    const tzOffset = patch.tzOffset ?? null;
    const rows = await this.prisma.$queryRaw<ProgressRow[]>`
      INSERT INTO user_progress
        ("id", "userId", "drinkId", "tzOffset", "createdAt", "updatedAt")
      VALUES
        (${newObjectId()}, ${userId}, ${drinkId}::text, COALESCE(${tzOffset}::int, 0),
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO UPDATE SET
        "drinkId" = COALESCE(${drinkId}::text, user_progress."drinkId"),
        "tzOffset" = COALESCE(${tzOffset}::int, user_progress."tzOffset"),
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *`;
    return this.mapToDomain(rows[0]);
  }
}
