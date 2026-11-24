import { ObjectId } from 'bson';
import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { CollectionMigrator } from '../migrator';
import {
  LOCAL_DATE_RE,
  MONTH_RE,
  nonEmptyString,
  skipMissingUsers,
  toDate,
  toHexId,
  toInt,
} from './user-progress.orphans';

export type FocusRawRow = Prisma.FocusSessionRawUncheckedCreateInput & {
  id: string;
};
export type FocusDailyRow = Prisma.FocusRollupDailyUncheckedCreateInput & {
  createdAt: Date;
};
export type FocusWeeklyRow = Prisma.FocusRollupWeeklyUncheckedCreateInput;
export type FocusMonthlyRow = Prisma.FocusRollupMonthlyUncheckedCreateInput;

/**
 * Raw sessions: `localDate` must be "YYYY-MM-DD", counters whole numbers,
 * `completedAt` a valid date; anything else is skipped. Rows are keyed by the
 * Mongo _id, so re-runs overwrite instead of duplicating.
 */
export function transformFocusRaw(
  doc: Record<string, any>,
): FocusRawRow | null {
  const id = toHexId(doc._id);
  const userId = toHexId(doc.userId);
  const clientSessionId = nonEmptyString(doc.clientSessionId);
  const completedAt = toDate(doc.completedAt);
  const durationMin = toInt(doc.durationMin);
  const xpEarned = toInt(doc.xpEarned);
  if (
    !id ||
    !userId ||
    !clientSessionId ||
    !completedAt ||
    durationMin === null ||
    xpEarned === null ||
    typeof doc.localDate !== 'string' ||
    !LOCAL_DATE_RE.test(doc.localDate)
  ) {
    return null;
  }
  return {
    id,
    userId,
    clientSessionId,
    completedAt,
    localDate: doc.localDate,
    durationMin,
    xpEarned,
  };
}

function counters(doc: Record<string, any>) {
  const sessionsCount = toInt(doc.sessionsCount);
  const totalFocusMin = toInt(doc.totalFocusMin);
  const totalXp = toInt(doc.totalXp);
  if (sessionsCount === null || totalFocusMin === null || totalXp === null) {
    return null;
  }
  return { sessionsCount, totalFocusMin, totalXp };
}

/** Daily rollups; `createdAt` falls back to the _id timestamp (TTL anchor). */
export function transformFocusDaily(
  doc: Record<string, any>,
): FocusDailyRow | null {
  const userId = toHexId(doc.userId);
  const c = counters(doc);
  if (
    !userId ||
    !c ||
    typeof doc.date !== 'string' ||
    !LOCAL_DATE_RE.test(doc.date)
  ) {
    return null;
  }
  const id = toHexId(doc._id);
  const createdAt =
    toDate(doc.createdAt) ??
    (id ? new ObjectId(id).getTimestamp() : new Date());
  return { userId, date: doc.date, ...c, createdAt };
}

export function transformFocusWeekly(
  doc: Record<string, any>,
): FocusWeeklyRow | null {
  const userId = toHexId(doc.userId);
  const c = counters(doc);
  if (
    !userId ||
    !c ||
    typeof doc.weekStart !== 'string' ||
    !LOCAL_DATE_RE.test(doc.weekStart)
  ) {
    return null;
  }
  return { userId, weekStart: doc.weekStart, ...c };
}

export function transformFocusMonthly(
  doc: Record<string, any>,
): FocusMonthlyRow | null {
  const userId = toHexId(doc.userId);
  const c = counters(doc);
  if (
    !userId ||
    !c ||
    typeof doc.month !== 'string' ||
    !MONTH_RE.test(doc.month)
  ) {
    return null;
  }
  return { userId, month: doc.month, ...c };
}

export const focusRawMigrator: CollectionMigrator<
  Record<string, any>,
  FocusRawRow
> = {
  name: 'focus-sessions-raw',
  collection: 'focus_sessions_raw',
  dependsOn: ['users'],
  transform: transformFocusRaw,
  filterBatch: (prisma, rows) =>
    skipMissingUsers(prisma, rows, 'focus_sessions_raw'),
  async upsertBatch(prisma: PrismaClient, rows: FocusRawRow[]) {
    await prisma.$transaction(
      rows.map((row) => {
        const { id, ...data } = row;
        return prisma.focusSessionRaw.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }),
    );
  },
  countTarget: (prisma) => prisma.focusSessionRaw.count(),
};

export const focusDailyMigrator: CollectionMigrator<
  Record<string, any>,
  FocusDailyRow
> = {
  name: 'focus-rollups-daily',
  collection: 'focus_sessions_daily',
  dependsOn: ['users'],
  transform: transformFocusDaily,
  filterBatch: (prisma, rows) =>
    skipMissingUsers(prisma, rows, 'focus_sessions_daily'),
  async upsertBatch(prisma: PrismaClient, rows: FocusDailyRow[]) {
    await prisma.$transaction(
      rows.map(({ userId, date, ...data }) =>
        prisma.focusRollupDaily.upsert({
          where: { userId_date: { userId, date } },
          create: { userId, date, ...data },
          update: data,
        }),
      ),
    );
  },
  countTarget: (prisma) => prisma.focusRollupDaily.count(),
};

export const focusWeeklyMigrator: CollectionMigrator<
  Record<string, any>,
  FocusWeeklyRow
> = {
  name: 'focus-rollups-weekly',
  collection: 'focus_sessions_weekly',
  dependsOn: ['users'],
  transform: transformFocusWeekly,
  filterBatch: (prisma, rows) =>
    skipMissingUsers(prisma, rows, 'focus_sessions_weekly'),
  async upsertBatch(prisma: PrismaClient, rows: FocusWeeklyRow[]) {
    await prisma.$transaction(
      rows.map(({ userId, weekStart, ...data }) =>
        prisma.focusRollupWeekly.upsert({
          where: { userId_weekStart: { userId, weekStart } },
          create: { userId, weekStart, ...data },
          update: data,
        }),
      ),
    );
  },
  countTarget: (prisma) => prisma.focusRollupWeekly.count(),
};

export const focusMonthlyMigrator: CollectionMigrator<
  Record<string, any>,
  FocusMonthlyRow
> = {
  name: 'focus-rollups-monthly',
  collection: 'focus_sessions_monthly',
  dependsOn: ['users'],
  transform: transformFocusMonthly,
  filterBatch: (prisma, rows) =>
    skipMissingUsers(prisma, rows, 'focus_sessions_monthly'),
  async upsertBatch(prisma: PrismaClient, rows: FocusMonthlyRow[]) {
    await prisma.$transaction(
      rows.map(({ userId, month, ...data }) =>
        prisma.focusRollupMonthly.upsert({
          where: { userId_month: { userId, month } },
          create: { userId, month, ...data },
          update: data,
        }),
      ),
    );
  },
  countTarget: (prisma) => prisma.focusRollupMonthly.count(),
};
