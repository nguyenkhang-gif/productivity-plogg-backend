import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { BatchResult, CollectionMigrator } from '../migrator';
import { existingUserIds, isOneOf, timestamps, toHexId } from './social-util';

export type FriendshipRow = Prisma.FriendshipUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

const STATUSES = ['pending', 'accepted', 'blocked'] as const;

/**
 * `userId` is whoever acted (sent the request / placed the block) and is kept
 * as is. Documents with an unknown status, a missing/invalid id on either side
 * or a self edge cannot be represented and are skipped.
 */
export function transformFriendship(
  doc: Record<string, any>,
): FriendshipRow | null {
  const id = toHexId(doc._id);
  const userId = toHexId(doc.userId);
  const friendId = toHexId(doc.friendId);
  // Mongo's schema defaults a missing status to 'pending'
  const status = doc.status === undefined ? 'pending' : doc.status;
  if (!id || !userId || !friendId || userId === friendId) return null;
  if (!isOneOf(status, STATUSES)) return null;
  return { id, userId, friendId, status, ...timestamps(doc, id) };
}

export const friendshipsMigrator: CollectionMigrator<
  Record<string, any>,
  FriendshipRow
> = {
  name: 'friendships',
  collection: 'friendships',
  dependsOn: ['users'],
  transform: transformFriendship,
  async upsertBatch(prisma: PrismaClient, rows: FriendshipRow[]) {
    return prisma.$transaction(async (tx): Promise<BatchResult> => {
      const users = await existingUserIds(
        tx,
        rows.flatMap((r) => [r.userId, r.friendId]),
      );
      const skipped: string[] = [];
      for (const row of rows) {
        if (!users.has(row.userId) || !users.has(row.friendId)) {
          skipped.push('user missing');
          continue;
        }
        // Postgres keeps one edge per unordered pair; if Mongo ended up with
        // both a->b and b->a (a race), the one migrated first wins.
        const reverse = await tx.friendship.findFirst({
          where: {
            id: { not: row.id },
            userId: row.friendId,
            friendId: row.userId,
          },
          select: { id: true },
        });
        if (reverse) {
          skipped.push('reverse edge already migrated for this pair');
          continue;
        }
        const { id, ...data } = row;
        await tx.friendship.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }
      return { skipped };
    });
  },
  countTarget: (prisma) => prisma.friendship.count(),
};
