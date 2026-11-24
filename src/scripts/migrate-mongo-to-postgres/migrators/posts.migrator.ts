import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { BatchResult, CollectionMigrator } from '../migrator';
import {
  clip,
  existingPostIds,
  existingUserIds,
  nonEmptyString,
  oneOf,
  timestamps,
  toCount,
  toDate,
  toHexId,
  unique,
} from './social-util';

export type PostRow = Prisma.PostUncheckedCreateInput & {
  id: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface PostTagsRow {
  postId: string;
  tagIds: string[];
}

const TYPES = ['ORIGINAL', 'REPOST'] as const;
const VISIBILITIES = ['PUBLIC', 'FRIENDS', 'PRIVATE'] as const;
const STATUSES = ['APPROVED', 'PENDING', 'REJECTED'] as const;

/**
 * Legacy documents predate several fields, so each one falls back to the
 * Mongo schema default: type ORIGINAL, visibility PUBLIC, moderation APPROVED
 * (posts written before moderation existed were live), published unless
 * explicitly false. `reactCount` is not stored (computed on read) and
 * `tagIds` go to post_tags. Over-long caption/rejectionReason are clipped to
 * the column size. A post without a usable _id or author id is skipped; a
 * missing author *user* is detected at write time.
 */
export function transformPost(doc: Record<string, any>): PostRow | null {
  const id = toHexId(doc._id);
  const authorId = toHexId(doc.authorId);
  if (!id || !authorId) return null;

  const type = oneOf(doc.type, TYPES, 'ORIGINAL');
  const originalPostId = toHexId(doc.originalPostId);
  // a REPOST without a resolvable original is meaningless
  if (type === 'REPOST' && !originalPostId) return null;

  const visibility = oneOf(doc.visibility, VISIBILITIES, 'PUBLIC');
  const moderationStatus = oneOf(doc.moderationStatus, STATUSES, 'APPROVED');

  return {
    id,
    authorId,
    type,
    title: nonEmptyString(doc.title),
    content: typeof doc.content === 'string' ? doc.content : '',
    imageUrls: Array.isArray(doc.imageUrls)
      ? doc.imageUrls.filter(
          (u: unknown): u is string => typeof u === 'string' && u.length > 0,
        )
      : [],
    isPublished: doc.isPublished !== false,
    categoryId: toHexId(doc.categoryId),
    viewCount: toCount(doc.viewCount),
    shareCount: toCount(doc.shareCount),
    visibility,
    moderationStatus,
    moderatedBy: toHexId(doc.moderatedBy),
    moderatedAt: toDate(doc.moderatedAt),
    rejectionReason: clip(doc.rejectionReason, 500),
    originalPostId: type === 'REPOST' ? originalPostId : null,
    caption: clip(doc.caption, 280),
    ...timestamps(doc, id),
  };
}

/** One row per post, even with no tags (reported as skipped at write time). */
export function transformPostTags(
  doc: Record<string, any>,
): PostTagsRow | null {
  const postId = toHexId(doc._id);
  if (!postId) return null;
  const tagIds = Array.isArray(doc.tagIds)
    ? unique(
        doc.tagIds
          .map((t: unknown) => toHexId(t))
          .filter((t: string | null): t is string => t !== null),
      )
    : [];
  return { postId, tagIds };
}

/**
 * Migrates in _id order, which is creation order, so an original is always
 * written before its reposts. Inside a batch non-reposts go first anyway, and
 * a repost whose original is not in Postgres is skipped (its original was
 * skipped for a missing author, or was deleted in Mongo).
 */
export const postsMigrator: CollectionMigrator<Record<string, any>, PostRow> = {
  name: 'posts',
  collection: 'posts',
  dependsOn: ['users', 'categories'],
  transform: transformPost,
  async upsertBatch(prisma: PrismaClient, rows: PostRow[]) {
    return prisma.$transaction(async (tx): Promise<BatchResult> => {
      const authors = await existingUserIds(
        tx,
        rows.map((r) => r.authorId),
      );
      const categoryIds = rows
        .map((r) => r.categoryId)
        .filter((c): c is string => !!c);
      const categories = new Set(
        categoryIds.length
          ? (
              await tx.category.findMany({
                where: { id: { in: unique(categoryIds) } },
                select: { id: true },
              })
            ).map((c) => c.id)
          : [],
      );

      const ordered = [
        ...rows.filter((r) => r.type !== 'REPOST'),
        ...rows.filter((r) => r.type === 'REPOST'),
      ];
      const skipped: string[] = [];
      for (const row of ordered) {
        if (!authors.has(row.authorId)) {
          skipped.push('author user missing');
          continue;
        }
        if (row.originalPostId) {
          const original = await existingPostIds(tx, [row.originalPostId]);
          if (!original.has(row.originalPostId)) {
            skipped.push('original post missing');
            continue;
          }
          const duplicate = await tx.post.findFirst({
            where: {
              id: { not: row.id },
              originalPostId: row.originalPostId,
              authorId: row.authorId,
            },
            select: { id: true },
          });
          if (duplicate) {
            skipped.push('author already reposted this post');
            continue;
          }
        }
        // a dangling category reference becomes "no category", as Mongo's
        // lookup would have shown
        const data: PostRow = {
          ...row,
          categoryId:
            row.categoryId && categories.has(row.categoryId)
              ? row.categoryId
              : null,
        };
        const { id, ...update } = data;
        await tx.post.upsert({ where: { id }, create: data, update });
      }
      return { skipped };
    });
  },
  countTarget: (prisma) => prisma.post.count(),
};

/**
 * Rebuilds the tag links of each post from its `tagIds` (replace semantics, so
 * re-runs converge). Tags that no longer exist are dropped; a post left with no
 * links, or whose row was not migrated, is reported as skipped. The target
 * count is the number of posts that have at least one link.
 */
export const postTagsMigrator: CollectionMigrator<
  Record<string, any>,
  PostTagsRow
> = {
  name: 'post_tags',
  collection: 'posts',
  dependsOn: ['posts', 'tags'],
  transform: transformPostTags,
  async upsertBatch(prisma: PrismaClient, rows: PostTagsRow[]) {
    return prisma.$transaction(async (tx): Promise<BatchResult> => {
      const posts = await existingPostIds(
        tx,
        rows.map((r) => r.postId),
      );
      const wanted = unique(rows.flatMap((r) => r.tagIds));
      const tags = new Set(
        wanted.length
          ? (
              await tx.tag.findMany({
                where: { id: { in: wanted } },
                select: { id: true },
              })
            ).map((t) => t.id)
          : [],
      );
      const skipped: string[] = [];
      for (const row of rows) {
        if (!posts.has(row.postId)) {
          skipped.push('post not migrated');
          continue;
        }
        const tagIds = row.tagIds.filter((t) => tags.has(t));
        if (row.tagIds.length === 0) {
          skipped.push('post has no tags');
          continue;
        }
        if (tagIds.length === 0) {
          skipped.push('none of the post tags exist');
          continue;
        }
        await tx.postTag.deleteMany({ where: { postId: row.postId } });
        await tx.postTag.createMany({
          data: tagIds.map((tagId) => ({ postId: row.postId, tagId })),
        });
      }
      return { skipped };
    });
  },
  async countTarget(prisma) {
    const [{ n }] = await prisma.$queryRaw<
      Array<{ n: number }>
    >`SELECT COUNT(DISTINCT "postId")::int AS n FROM "post_tags"`;
    return n;
  },
};
