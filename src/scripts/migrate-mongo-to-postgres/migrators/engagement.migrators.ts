import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { BatchResult, CollectionMigrator } from '../migrator';
import {
  existingPostIds,
  existingUserIds,
  nonEmptyString,
  timestamps,
  toHexId,
} from './social-util';

export type CommentRow = Prisma.CommentUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};
export type ReactionRow = Prisma.ReactionUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};
export type BookmarkRow = Prisma.BookmarkUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Comments need an id, a post, an author and non-empty content (Mongo `required`). */
export function transformComment(doc: Record<string, any>): CommentRow | null {
  const id = toHexId(doc._id);
  const postId = toHexId(doc.postId);
  const authorId = toHexId(doc.authorId);
  const content = nonEmptyString(doc.content);
  if (!id || !postId || !authorId || !content) return null;
  return {
    id,
    postId,
    authorId,
    content,
    iconUrl: nonEmptyString(doc.iconUrl),
    ...timestamps(doc, id),
  };
}

/** `type` is required in Mongo; documents without one cannot be represented. */
export function transformReaction(
  doc: Record<string, any>,
): ReactionRow | null {
  const id = toHexId(doc._id);
  const postId = toHexId(doc.postId);
  const userId = toHexId(doc.userId);
  const type = nonEmptyString(doc.type);
  if (!id || !postId || !userId || !type) return null;
  return {
    id,
    postId,
    userId,
    type,
    icon: nonEmptyString(doc.icon),
    ...timestamps(doc, id),
  };
}

export function transformBookmark(
  doc: Record<string, any>,
): BookmarkRow | null {
  const id = toHexId(doc._id);
  const postId = toHexId(doc.postId);
  const userId = toHexId(doc.userId);
  if (!id || !postId || !userId) return null;
  return { id, postId, userId, ...timestamps(doc, id) };
}

/**
 * Splits rows into those whose post and user exist and reasons for the rest.
 * `userField` is the column that points at the user (authorId / userId).
 */
async function partitionByRefs<T extends { postId: string }>(
  prisma: Pick<PrismaClient, 'user' | 'post'>,
  rows: T[],
  userField: keyof T & string,
): Promise<{ keep: T[]; skipped: string[] }> {
  const [users, posts] = await Promise.all([
    existingUserIds(
      prisma,
      rows.map((r) => r[userField] as string),
    ),
    existingPostIds(
      prisma,
      rows.map((r) => r.postId),
    ),
  ]);
  const keep: T[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    if (!posts.has(row.postId)) skipped.push('post missing');
    else if (!users.has(row[userField] as string)) skipped.push('user missing');
    else keep.push(row);
  }
  return { keep, skipped };
}

export const commentsMigrator: CollectionMigrator<
  Record<string, any>,
  CommentRow
> = {
  name: 'comments',
  collection: 'comments',
  dependsOn: ['users', 'posts'],
  transform: transformComment,
  async upsertBatch(prisma: PrismaClient, rows: CommentRow[]) {
    const { keep, skipped } = await partitionByRefs(prisma, rows, 'authorId');
    await prisma.$transaction(
      keep.map((row) => {
        const { id, ...data } = row;
        return prisma.comment.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }),
    );
    return { skipped } satisfies BatchResult;
  },
  countTarget: (prisma) => prisma.comment.count(),
};

export const reactionsMigrator: CollectionMigrator<
  Record<string, any>,
  ReactionRow
> = {
  name: 'reactions',
  collection: 'reactions',
  dependsOn: ['users', 'posts'],
  transform: transformReaction,
  async upsertBatch(prisma: PrismaClient, rows: ReactionRow[]) {
    const { keep, skipped } = await partitionByRefs(prisma, rows, 'userId');
    await prisma.$transaction(
      keep.map((row) => {
        const { id, ...data } = row;
        return prisma.reaction.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }),
    );
    return { skipped } satisfies BatchResult;
  },
  countTarget: (prisma) => prisma.reaction.count(),
};

export const bookmarksMigrator: CollectionMigrator<
  Record<string, any>,
  BookmarkRow
> = {
  name: 'bookmarks',
  collection: 'bookmarks',
  dependsOn: ['users', 'posts'],
  transform: transformBookmark,
  async upsertBatch(prisma: PrismaClient, rows: BookmarkRow[]) {
    const { keep, skipped } = await partitionByRefs(prisma, rows, 'userId');
    await prisma.$transaction(
      keep.map((row) => {
        const { id, ...data } = row;
        return prisma.bookmark.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }),
    );
    return { skipped } satisfies BatchResult;
  },
  countTarget: (prisma) => prisma.bookmark.count(),
};
