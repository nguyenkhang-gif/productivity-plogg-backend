import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import {
  DuplicateSessionError,
  FocusSessionRepository,
} from 'src/modules/productivity/focus/domain/focus-session.repository.interface';
import { FocusSession as FocusSessionEntity } from 'src/modules/productivity/focus/domain/focus-session.entity';
import { FocusRollup } from 'src/modules/productivity/focus/domain/focus-rollup.entity';

/**
 * Rollups are rebuilt from their source rows with INSERT ... SELECT ... ON
 * CONFLICT DO UPDATE (the counterpart of Mongo's `$merge whenMatched: replace`):
 * idempotent, and each statement is atomic, so concurrent runs and concurrent
 * recordings cannot corrupt a total. "YYYY-MM-DD" strings compare
 * lexicographically, so range filters on the varchar columns are correct.
 */
@Injectable()
export class PrismaFocusSessionRepository implements FocusSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insertRaw(session: FocusSessionEntity): Promise<FocusSessionEntity> {
    try {
      const row = await this.prisma.focusSessionRaw.create({
        data: {
          id: newObjectId(),
          userId: session.userId,
          clientSessionId: session.clientSessionId,
          completedAt: session.completedAt,
          localDate: session.localDate,
          durationMin: session.durationMin,
          xpEarned: session.xpEarned,
        },
      });
      return new FocusSessionEntity({ ...session, id: row.id });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new DuplicateSessionError(session.clientSessionId);
      }
      throw err;
    }
  }

  async aggregateDailyFromRaw(
    userId: string,
    from: string,
    to: string,
  ): Promise<FocusRollup[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        localDate: string;
        sessionsCount: number;
        totalFocusMin: number;
        totalXp: number;
      }>
    >`
      SELECT "localDate",
             COUNT(*)::int AS "sessionsCount",
             COALESCE(SUM("durationMin"), 0)::int AS "totalFocusMin",
             COALESCE(SUM("xpEarned"), 0)::int AS "totalXp"
      FROM focus_sessions_raw
      WHERE "userId" = ${userId} AND "localDate" >= ${from} AND "localDate" <= ${to}
      GROUP BY "localDate"
      ORDER BY "localDate" ASC`;
    return rows.map(
      (r) =>
        new FocusRollup({
          userId,
          periodKey: r.localDate,
          sessionsCount: r.sessionsCount,
          totalFocusMin: r.totalFocusMin,
          totalXp: r.totalXp,
        }),
    );
  }

  async rollupDaily(localDates: string[]): Promise<void> {
    if (localDates.length === 0) return;
    await this.prisma.$executeRaw`
      INSERT INTO focus_rollups_daily
        ("userId", "date", "sessionsCount", "totalFocusMin", "totalXp", "createdAt")
      SELECT "userId", "localDate", COUNT(*)::int, SUM("durationMin")::int,
             SUM("xpEarned")::int, CURRENT_TIMESTAMP
      FROM focus_sessions_raw
      WHERE "localDate" = ANY(${localDates}::text[])
      GROUP BY "userId", "localDate"
      ON CONFLICT ("userId", "date") DO UPDATE SET
        "sessionsCount" = EXCLUDED."sessionsCount",
        "totalFocusMin" = EXCLUDED."totalFocusMin",
        "totalXp" = EXCLUDED."totalXp",
        "createdAt" = EXCLUDED."createdAt"`;
  }

  async rollupWeekly(weekStart: string, weekEnd: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO focus_rollups_weekly
        ("userId", "weekStart", "sessionsCount", "totalFocusMin", "totalXp")
      SELECT "userId", ${weekStart}::text, SUM("sessionsCount")::int,
             SUM("totalFocusMin")::int, SUM("totalXp")::int
      FROM focus_rollups_daily
      WHERE "date" >= ${weekStart} AND "date" <= ${weekEnd}
      GROUP BY "userId"
      ON CONFLICT ("userId", "weekStart") DO UPDATE SET
        "sessionsCount" = EXCLUDED."sessionsCount",
        "totalFocusMin" = EXCLUDED."totalFocusMin",
        "totalXp" = EXCLUDED."totalXp"`;
  }

  async rollupMonthly(month: string): Promise<void> {
    const from = `${month}-01`;
    const to = `${month}-31`;
    await this.prisma.$executeRaw`
      INSERT INTO focus_rollups_monthly
        ("userId", "month", "sessionsCount", "totalFocusMin", "totalXp")
      SELECT "userId", ${month}::text, SUM("sessionsCount")::int,
             SUM("totalFocusMin")::int, SUM("totalXp")::int
      FROM focus_rollups_daily
      WHERE "date" >= ${from} AND "date" <= ${to}
      GROUP BY "userId"
      ON CONFLICT ("userId", "month") DO UPDATE SET
        "sessionsCount" = EXCLUDED."sessionsCount",
        "totalFocusMin" = EXCLUDED."totalFocusMin",
        "totalXp" = EXCLUDED."totalXp"`;
  }
}
