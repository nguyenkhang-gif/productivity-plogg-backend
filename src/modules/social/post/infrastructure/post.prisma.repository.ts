import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId, isObjectId } from 'src/shared/database/object-id';
import { escapeLike } from 'src/shared/database/like';
import {
  AdminPostFilter,
  FindPostByIdOptions,
  PaginatedPosts,
  PostFeedFilter,
  PostRepository,
  PostStats,
} from 'src/modules/social/post/domain/post.repository.interface';
import {
  Post as PostEntity,
  PostModerationStatus,
  PostVisibility,
} from 'src/modules/social/post/domain/post.entity';
import { PostEmbedCard } from '../domain/post-embed-card';
import { canViewAuthorPage, decidePostView } from '../domain/post.policy';
import { Relationship } from '../../friendship/domain/relationship';
import {
  isRecordNotFound,
  isUniqueViolation,
} from 'src/modules/social/shared/prisma-errors';

const VISIBILITIES: readonly string[] = ['PUBLIC', 'FRIENDS', 'PRIVATE'];
const MODERATION_STATUSES: readonly string[] = [
  'APPROVED',
  'PENDING',
  'REJECTED',
];

// reactCount / commentCount are computed on read (like the Mongo $lookup
// counts); the viewer-specific includes are added only when a viewer is known.
const BASE_INCLUDE = {
  author: {
    select: {
      id: true,
      fullName: true,
      username: true,
      profilePic: true,
      isPrivate: true,
    },
  },
  category: { select: { id: true, name: true, slug: true } },
  tags: {
    select: {
      tagId: true,
      tag: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { tagId: 'asc' },
  },
  _count: { select: { comments: true, reactions: true } },
} satisfies Prisma.PostInclude;

const viewerInclude = (userId: string) => ({
  reactions: {
    where: { userId },
    select: { type: true, icon: true },
    take: 1,
  },
  bookmarks: { where: { userId }, select: { id: true }, take: 1 },
});

type PostRow = Prisma.PostGetPayload<{ include: typeof BASE_INCLUDE }> & {
  reactions?: Array<{ type: string; icon: string | null }>;
  bookmarks?: Array<{ id: string }>;
};

const withViewer = (userId?: string): typeof BASE_INCLUDE =>
  (userId
    ? { ...BASE_INCLUDE, ...viewerInclude(userId) }
    : BASE_INCLUDE) as typeof BASE_INCLUDE;

const paginated = (
  items: PostEntity[],
  page: number,
  limit: number,
  total: number,
): PaginatedPosts => ({
  items,
  pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
});

@Injectable()
export class PrismaPostRepository implements PostRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Accepted friendships only, in either direction. */
  private async getFriendIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId }, { friendId: userId }],
      },
      select: { userId: true, friendId: true },
    });
    return new Set(
      rows.map((f) => (f.userId === userId ? f.friendId : f.userId)),
    );
  }

  private async areFriends(a: string, b: string): Promise<boolean> {
    const count = await this.prisma.friendship.count({
      where: {
        status: 'accepted',
        OR: [
          { userId: a, friendId: b },
          { userId: b, friendId: a },
        ],
      },
    });
    return count > 0;
  }

  private async buildRelationship(
    authorId: string,
    currentUserId: string | undefined,
    needsFriendship: boolean,
  ): Promise<Relationship> {
    const isSelf = !!currentUserId && currentUserId === authorId;
    const isFriend =
      !isSelf && !!currentUserId && needsFriendship
        ? await this.areFriends(currentUserId, authorId)
        : false;
    return {
      isSelf,
      isFriend,
      blockedByViewer: false,
      blockedViewer: false,
    };
  }

  private async isHiddenByPrivateAccount(
    authorId: string,
    currentUserId?: string,
  ): Promise<boolean> {
    if (currentUserId && currentUserId === authorId) return false;
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { isPrivate: true },
    });
    const relationship = await this.buildRelationship(
      authorId,
      currentUserId,
      !!author?.isPrivate,
    );
    return !canViewAuthorPage(
      { id: currentUserId },
      { id: authorId, isPrivate: !!author?.isPrivate },
      relationship,
    );
  }

  /**
   * Feed visibility:
   *  PUBLIC  -> approved only, and not from a private account unless the
   *             viewer is that author or a friend
   *  FRIENDS -> only from friends
   *  own posts -> any visibility / moderation status
   *  PRIVATE -> never in a feed (only via findByAuthor for the author)
   * plus: published only, and never from a blocked author (either direction).
   */
  private async visibilityWhere(
    currentUserId: string,
    blockedAuthorIds: string[] = [],
  ): Promise<Prisma.PostWhereInput[]> {
    const friendIds = [...(await this.getFriendIds(currentUserId))];
    return [
      { isPublished: true },
      {
        OR: [
          {
            visibility: 'PUBLIC',
            moderationStatus: 'APPROVED',
            author: {
              OR: [
                { isPrivate: false },
                { id: { in: [...friendIds, currentUserId] } },
              ],
            },
          },
          { visibility: 'FRIENDS', authorId: { in: friendIds } },
          { authorId: currentUserId },
        ],
      },
      ...(blockedAuthorIds.length > 0
        ? [{ authorId: { notIn: blockedAuthorIds } }]
        : []),
    ];
  }

  private mapToDomain(row: PostRow): PostEntity {
    const reaction = row.reactions?.[0];
    return new PostEntity({
      id: row.id,
      authorId: row.authorId,
      type: row.type,
      title: row.title ?? undefined,
      content: row.content,
      imageUrls: row.imageUrls,
      categoryId: row.categoryId ?? null,
      tagIds: row.tags.map((t) => t.tagId),
      viewCount: row.viewCount,
      reactCount: row._count.reactions,
      shareCount: row.shareCount,
      visibility: row.visibility,
      isPublished: row.isPublished,
      moderationStatus: row.moderationStatus,
      moderatedBy: row.moderatedBy ?? null,
      moderatedAt: row.moderatedAt ?? null,
      rejectionReason: row.rejectionReason ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      originalPostId: row.originalPostId ?? undefined,
      caption: row.caption ?? undefined,
      author: row.author
        ? {
            id: row.author.id,
            fullName: row.author.fullName,
            username: row.author.username,
            profilePic: row.author.profilePic ?? undefined,
          }
        : undefined,
      category: row.category
        ? {
            id: row.category.id,
            name: row.category.name,
            slug: row.category.slug,
          }
        : null,
      tags: row.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        slug: t.tag.slug,
      })),
      commentCount: row._count.comments,
      userReaction: reaction
        ? { type: reaction.type, icon: reaction.icon ?? undefined }
        : null,
      isBookmarked: (row.bookmarks?.length ?? 0) > 0,
    });
  }

  // ─── Reads ────────────────────────────────────────────────────────────────

  async findById(
    id: string,
    currentUserId?: string,
    options?: FindPostByIdOptions,
  ): Promise<PostEntity | null> {
    const row = (await this.prisma.post.findFirst({
      where: { id, isPublished: true },
      include: withViewer(currentUserId),
    })) as PostRow | null;
    if (!row) return null;

    const authorId = row.authorId;
    if (options?.blockedAuthorIds?.includes(authorId)) return null;

    const needsFriendship =
      row.visibility === 'FRIENDS' || !!row.author?.isPrivate;
    const relationship = await this.buildRelationship(
      authorId,
      currentUserId,
      needsFriendship,
    );
    const decision = decidePostView(
      { id: currentUserId },
      {
        authorId,
        visibility: row.visibility,
        moderationStatus: row.moderationStatus,
      },
      row.author ? { id: authorId, isPrivate: !!row.author.isPrivate } : null,
      relationship,
    );

    if (!decision.allowed) {
      switch (decision.reason) {
        case 'NOT_FOUND':
          return null;
        case 'AWAITING_MODERATION':
          throw new ForbiddenException('This post is awaiting moderation');
        case 'PRIVATE':
          throw new ForbiddenException('This post is private');
        case 'FRIENDS_ONLY':
          throw new ForbiddenException('This post is for friends only');
      }
    }

    return this.mapToDomain(row);
  }

  async findByIdRaw(id: string): Promise<PostEntity | null> {
    const row = (await this.prisma.post.findUnique({
      where: { id },
      include: withViewer(),
    })) as PostRow | null;
    return row ? this.mapToDomain(row) : null;
  }

  async findAll(
    page: number,
    limit: number,
    currentUserId: string,
    filter?: PostFeedFilter,
  ): Promise<PaginatedPosts> {
    const and = await this.visibilityWhere(
      currentUserId,
      filter?.blockedAuthorIds,
    );
    and.push({ type: { not: 'REPOST' } });
    if (filter?.categoryId) and.push({ categoryId: filter.categoryId });
    if (filter?.excludeId) and.push({ id: { not: filter.excludeId } });
    if (filter?.tags?.length) {
      // Same quirk as the Mongo repository: slugs that match no tag at all
      // leave the feed unfiltered instead of empty.
      const found = await this.prisma.tag.findMany({
        where: { slug: { in: filter.tags } },
        select: { id: true },
      });
      if (found.length) {
        and.push({
          tags: { some: { tagId: { in: found.map((t) => t.id) } } },
        });
      }
    }
    const where: Prisma.PostWhereInput = { AND: and };

    const orderBy: Prisma.PostOrderByWithRelationInput[] =
      filter?.sortByUpdatedAt != null
        ? [
            { updatedAt: filter.sortByUpdatedAt === 1 ? 'asc' : 'desc' },
            { id: 'desc' },
          ]
        : [{ createdAt: 'desc' }, { id: 'desc' }];

    const [total, rows] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: withViewer(currentUserId),
      }) as Promise<PostRow[]>,
    ]);
    return paginated(
      rows.map((r) => this.mapToDomain(r)),
      page,
      limit,
      total,
    );
  }

  async findByAuthor(
    authorId: string,
    page: number,
    limit: number,
    currentUserId: string,
  ): Promise<PaginatedPosts> {
    if (await this.isHiddenByPrivateAccount(authorId, currentUserId)) {
      return paginated([], page, limit, 0);
    }

    const approvedPublic: Prisma.PostWhereInput = {
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
    };
    let visibilityCondition: Prisma.PostWhereInput;
    if (currentUserId === authorId) {
      visibilityCondition = {}; // authors see all of their own posts
    } else if (currentUserId) {
      // non-self viewers never see un-approved PUBLIC posts
      visibilityCondition = (await this.areFriends(currentUserId, authorId))
        ? { OR: [{ visibility: 'FRIENDS' }, approvedPublic] }
        : approvedPublic;
    } else {
      visibilityCondition = approvedPublic;
    }

    const where: Prisma.PostWhereInput = {
      AND: [
        { isPublished: true, authorId, type: { not: 'REPOST' } },
        visibilityCondition,
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: withViewer(currentUserId),
      }) as Promise<PostRow[]>,
    ]);
    return paginated(
      rows.map((r) => this.mapToDomain(r)),
      page,
      limit,
      total,
    );
  }

  /** Most reactions first, newest first on ties; same visibility as the feed. */
  async findTrending(
    limit: number,
    currentUserId: string,
    blockedAuthorIds?: string[],
  ): Promise<PostEntity[]> {
    const and = await this.visibilityWhere(currentUserId, blockedAuthorIds);
    const rows = (await this.prisma.post.findMany({
      where: { AND: and },
      orderBy: [
        { reactions: { _count: 'desc' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit,
      include: withViewer(currentUserId),
    })) as PostRow[];
    return rows.map((r) => this.mapToDomain(r));
  }

  async findPendingPublic(
    page: number,
    limit: number,
  ): Promise<PaginatedPosts> {
    const where: Prisma.PostWhereInput = {
      isPublished: true,
      visibility: 'PUBLIC',
      moderationStatus: 'PENDING',
      type: { not: 'REPOST' },
    };
    const [total, rows] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: withViewer(),
      }) as Promise<PostRow[]>,
    ]);
    return paginated(
      rows.map((r) => this.mapToDomain(r)),
      page,
      limit,
      total,
    );
  }

  async findAllAdmin(filter: AdminPostFilter): Promise<PaginatedPosts> {
    const { search, authorId, moderationStatus, visibility, page, limit } =
      filter;

    // Mongo matches nothing for a value outside the enum; Postgres would throw.
    if (
      (visibility && !VISIBILITIES.includes(visibility)) ||
      (moderationStatus && !MODERATION_STATUSES.includes(moderationStatus))
    ) {
      return paginated([], page, limit, 0);
    }

    const where: Prisma.PostWhereInput = {
      type: { not: 'REPOST' },
      ...(search
        ? { title: { contains: escapeLike(search), mode: 'insensitive' } }
        : {}),
      ...(authorId ? { authorId } : {}),
      ...(moderationStatus
        ? { moderationStatus: moderationStatus as PostModerationStatus }
        : {}),
      ...(visibility ? { visibility: visibility as PostVisibility } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        omit: { content: true },
        include: withViewer(),
      }) as unknown as Promise<PostRow[]>,
    ]);
    return paginated(
      rows.map((r) => this.mapToDomain(r)),
      page,
      limit,
      total,
    );
  }

  async getStatsByAuthor(authorId: string): Promise<PostStats> {
    const mine: Prisma.PostWhereInput = { authorId, isPublished: true };
    const [postCount, totalReactionsReceived, totalComments] =
      await Promise.all([
        this.prisma.post.count({ where: mine }),
        this.prisma.reaction.count({ where: { post: mine } }),
        this.prisma.comment.count({ where: { post: mine } }),
      ]);
    return { postCount, totalReactionsReceived, totalComments };
  }

  async countByAuthor(authorId: string): Promise<number> {
    return this.prisma.post.count({ where: { authorId } });
  }

  // ─── Writes ───────────────────────────────────────────────────────────────

  async setModerationStatus(
    id: string,
    status: PostModerationStatus,
    moderatorId: string,
    reason?: string | null,
  ): Promise<PostEntity> {
    let authorId: string;
    try {
      const updated = await this.prisma.post.update({
        where: { id },
        data: {
          moderationStatus: status,
          moderatedBy: moderatorId,
          moderatedAt: new Date(),
          rejectionReason: status === 'REJECTED' ? (reason ?? null) : null,
        },
        select: { authorId: true },
      });
      authorId = updated.authorId;
    } catch (err) {
      if (isRecordNotFound(err)) throw new NotFoundException('Post not found');
      throw err;
    }
    const full = await this.findById(id, authorId);
    return full!;
  }

  async create(post: PostEntity): Promise<PostEntity> {
    const id = newObjectId();
    const tagIds = [...new Set(post.tagIds ?? [])];
    try {
      await this.prisma.post.create({
        data: {
          id,
          authorId: post.authorId,
          type: post.type ?? 'ORIGINAL',
          title: post.title ?? null,
          content: post.content,
          imageUrls: post.imageUrls ?? [],
          isPublished: post.isPublished ?? true,
          categoryId: post.categoryId ?? null,
          viewCount: 0,
          shareCount: 0,
          originalPostId: post.originalPostId ?? null,
          caption: post.caption ?? null,
          visibility: post.visibility ?? 'PUBLIC',
          moderationStatus: post.moderationStatus ?? 'APPROVED',
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
    } catch (err) {
      // (originalPostId, authorId): a user can repost a given post only once.
      if (isUniqueViolation(err))
        throw new ConflictException('Already shared this post');
      throw err;
    }
    const full = await this.findById(id, post.authorId);
    return full!;
  }

  async update(
    id: string,
    data: Partial<PostEntity>,
    currentUserId?: string,
  ): Promise<PostEntity> {
    const tagIds =
      data.tagIds !== undefined ? [...new Set(data.tagIds)] : undefined;
    try {
      await this.prisma.post.update({
        where: { id },
        data: {
          title: data.title,
          content: data.content,
          imageUrls: data.imageUrls,
          isPublished: data.isPublished,
          categoryId: data.categoryId,
          visibility: data.visibility,
          moderationStatus: data.moderationStatus,
          moderatedBy: data.moderatedBy,
          moderatedAt: data.moderatedAt,
          rejectionReason: data.rejectionReason,
          caption: data.caption,
          ...(tagIds !== undefined
            ? {
                tags: {
                  deleteMany: {},
                  create: tagIds.map((tagId) => ({ tagId })),
                },
              }
            : {}),
        },
        select: { id: true },
      });
    } catch (err) {
      if (isRecordNotFound(err)) throw new NotFoundException('Post not found');
      throw err;
    }
    const full = await this.findById(id, currentUserId);
    return full!;
  }

  /** Comments, reactions, bookmarks, tag links and reposts go with it (FK cascade). */
  async delete(id: string): Promise<void> {
    const { count } = await this.prisma.post.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException('Post not found');
  }

  async incrementViewCount(id: string): Promise<void> {
    const { count } = await this.prisma.post.updateMany({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    if (count === 0) throw new NotFoundException('Post not found');
  }

  async nullifyCategoryOnPosts(categoryId: string): Promise<void> {
    await this.prisma.post.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    });
  }

  // ─── Share ────────────────────────────────────────────────────────────────

  async findRepostByUser(
    originalPostId: string,
    userId: string,
  ): Promise<PostEntity | null> {
    const row = await this.prisma.post.findFirst({
      where: {
        type: 'REPOST',
        originalPostId,
        authorId: userId,
        isPublished: true,
      },
    });
    if (!row) return null;
    return new PostEntity({
      id: row.id,
      authorId: row.authorId,
      type: row.type,
      originalPostId: row.originalPostId ?? undefined,
      caption: row.caption ?? undefined,
      content: row.content,
      isPublished: row.isPublished,
      shareCount: row.shareCount,
      reactCount: 0,
    });
  }

  async getShareCount(postId: string): Promise<number> {
    const row = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { shareCount: true },
    });
    return row?.shareCount ?? 0;
  }

  async incrementShareCount(postId: string): Promise<void> {
    await this.prisma.post.updateMany({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
    });
  }

  async decrementShareCount(postId: string): Promise<void> {
    await this.prisma.post.updateMany({
      where: { id: postId },
      data: { shareCount: { decrement: 1 } },
    });
  }

  // ─── Link embeds ──────────────────────────────────────────────────────────

  async findManyForEmbed(
    ids: string[],
    viewerId: string,
    blockedAuthorIds: string[] = [],
  ): Promise<PostEmbedCard[]> {
    const validIds = ids.filter((id) => isObjectId(id));
    if (validIds.length === 0) return [];

    const and = await this.visibilityWhere(viewerId, blockedAuthorIds);
    const rows = await this.prisma.post.findMany({
      where: { AND: [{ id: { in: validIds } }, ...and] },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        content: true,
        imageUrls: true,
        author: {
          select: { fullName: true, username: true, profilePic: true },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? null,
      // first 160 code points, like $substrCP
      excerpt:
        Array.from(r.content ?? '')
          .slice(0, 160)
          .join('') || null,
      imageUrl: r.imageUrls[0] ?? null,
      authorName: r.author?.fullName ?? r.author?.username ?? null,
      authorAvatar: r.author?.profilePic ?? null,
      createdAt: r.createdAt ?? null,
    }));
  }
}
