import { ObjectId } from 'bson';
import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { CollectionMigrator } from '../migrator';
import {
  LOCAL_DATE_RE,
  nonEmptyString,
  skipMissingUsers,
  toDate,
  toHexId,
  toInt,
} from './user-progress.orphans';

export type UserProgressRow = Prisma.UserProgressUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Counters default to 0 like the Mongoose schema; `__v` and unknown fields are
 * dropped. Documents without a usable _id or userId are skipped.
 */
export function transformUserProgress(
  doc: Record<string, any>,
): UserProgressRow | null {
  const id = toHexId(doc._id);
  const userId = toHexId(doc.userId);
  if (!id || !userId) return null;

  const createdAt = toDate(doc.createdAt) ?? new ObjectId(id).getTimestamp();
  const updatedAt = toDate(doc.updatedAt) ?? createdAt;
  const lastActive =
    typeof doc.lastActiveLocalDate === 'string' &&
    LOCAL_DATE_RE.test(doc.lastActiveLocalDate)
      ? doc.lastActiveLocalDate
      : null;

  return {
    id,
    userId,
    totalXp: toInt(doc.totalXp) ?? 0,
    totalFocusMin: toInt(doc.totalFocusMin) ?? 0,
    drinkId: nonEmptyString(doc.drinkId),
    tzOffset: toInt(doc.tzOffset) ?? 0,
    todayCount: toInt(doc.todayCount) ?? 0,
    todayFocusMin: toInt(doc.todayFocusMin) ?? 0,
    lastActiveLocalDate: lastActive,
    currentStreak: toInt(doc.currentStreak) ?? 0,
    longestStreak: toInt(doc.longestStreak) ?? 0,
    createdAt,
    updatedAt,
  };
}

export const userProgressMigrator: CollectionMigrator<
  Record<string, any>,
  UserProgressRow
> = {
  name: 'user-progress',
  collection: 'user_progress',
  dependsOn: ['users'],
  transform: transformUserProgress,
  filterBatch: (prisma, rows) =>
    skipMissingUsers(prisma, rows, 'user_progress'),
  async upsertBatch(prisma: PrismaClient, rows: UserProgressRow[]) {
    await prisma.$transaction(
      rows.map((row) => {
        const { id, ...data } = row;
        return prisma.userProgress.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }),
    );
  },
  countTarget: (prisma) => prisma.userProgress.count(),
};
