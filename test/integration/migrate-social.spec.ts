import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { ObjectId } from 'bson';
import { PrismaService } from 'src/shared/database/prisma.service';
import {
  CollectionMigrator,
  MigrationSource,
  formatReport,
  hasFailures,
  runMigrators,
} from 'src/scripts/migrate-mongo-to-postgres/migrator';
import { MIGRATORS } from 'src/scripts/migrate-mongo-to-postgres/registry';

class FakeSource implements MigrationSource {
  constructor(private readonly data: Record<string, any[]>) {}
  async count(collection: string) {
    return (this.data[collection] ?? []).length;
  }
  async *read(collection: string, batchSize: number) {
    const docs = this.data[collection] ?? [];
    for (let i = 0; i < docs.length; i += batchSize) {
      yield docs.slice(i, i + batchSize);
    }
  }
}

describe('social migrators (integration)', () => {
  let prisma: PrismaService;
  const tag = new ObjectId().toHexString().slice(-8);
  const prefix = `msoc_${tag}_`;
  const slugPrefix = `msoc-${tag}-`;
  const own = { username: { startsWith: prefix } };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: own });
    await prisma.tag.deleteMany({
      where: { slug: { startsWith: slugPrefix } },
    });
    await prisma.category.deleteMany({
      where: { slug: { startsWith: slugPrefix } },
    });
    await prisma.onModuleDestroy();
  });

  /** The registry migrators, with target counts limited to this test's rows. */
  const scoped = (): CollectionMigrator[] => {
    const authors = { author: own };
    const counts: Record<string, CollectionMigrator['countTarget']> = {
      users: (p) => p.user.count({ where: own }),
      categories: (p) =>
        p.category.count({ where: { slug: { startsWith: slugPrefix } } }),
      tags: (p) => p.tag.count({ where: { slug: { startsWith: slugPrefix } } }),
      friendships: (p) => p.friendship.count({ where: { user: own } }),
      posts: (p) => p.post.count({ where: authors }),
      post_tags: async (p) =>
        (
          await p.postTag.groupBy({
            by: ['postId'],
            where: { post: authors },
          })
        ).length,
      comments: (p) => p.comment.count({ where: { post: authors } }),
      reactions: (p) => p.reaction.count({ where: { post: authors } }),
      bookmarks: (p) => p.bookmark.count({ where: { post: authors } }),
    };
    return MIGRATORS.map((m) => ({ ...m, countTarget: counts[m.name] }));
  };

  const oid = () => new ObjectId();
  const hex = (id: ObjectId) => id.toHexString();

  const build = () => {
    const [u1, u2, ghost] = [oid(), oid(), oid()];
    const [cat] = [oid()];
    const [t1, t2, missingTag] = [oid(), oid(), oid()];
    // ObjectIds minted in order => _id order is creation order
    const [p1, p2, p3, p4, p5] = [oid(), oid(), oid(), oid(), oid()];
    const t = (n: number) => new Date(`2024-05-0${n}T00:00:00.000Z`);
    const user = (id: ObjectId, n: number) => ({
      _id: id,
      fullName: `Mig ${n}`,
      username: `${prefix}${n}`,
      email: `${prefix}${n}@example.com`,
      passwordHash: 'h',
      createdAt: t(1),
      updatedAt: t(1),
    });

    return {
      ids: { u1, u2, ghost, cat, t1, t2, p1, p2, p3, p4, p5 },
      data: {
        users: [user(u1, 1), user(u2, 2)],
        categories: [
          {
            _id: cat,
            name: 'Tech',
            slug: `${slugPrefix}tech`,
            postCount: 1,
            createdAt: t(1),
            updatedAt: t(1),
          },
        ],
        tags: [
          {
            _id: t1,
            name: 'NestJS',
            slug: `${slugPrefix}nestjs`,
            postCount: 1,
            createdAt: t(1),
          },
          {
            _id: t2,
            name: 'Prisma',
            slug: `${slugPrefix}prisma`,
            postCount: 1,
            createdAt: t(1),
          },
        ],
        friendships: [
          {
            _id: oid(),
            userId: hex(u1),
            friendId: hex(u2),
            status: 'accepted',
            createdAt: t(2),
            updatedAt: t(2),
          },
          // friend of a user that was never migrated
          {
            _id: oid(),
            userId: hex(u1),
            friendId: hex(ghost),
            status: 'pending',
            createdAt: t(2),
          },
          // reverse of the first edge (a Mongo race): only one survives
          {
            _id: oid(),
            userId: hex(u2),
            friendId: hex(u1),
            status: 'pending',
            createdAt: t(3),
          },
          // unknown status: not representable
          {
            _id: oid(),
            userId: hex(u2),
            friendId: hex(oid()),
            status: 'declined',
          },
        ],
        posts: [
          {
            _id: p1,
            authorId: hex(u1),
            type: 'ORIGINAL',
            title: 'First',
            content: 'Hello',
            imageUrls: ['a.png'],
            isPublished: true,
            categoryId: hex(cat),
            tagIds: [hex(t1), hex(t2), hex(missingTag)],
            viewCount: 4,
            shareCount: 1,
            visibility: 'PUBLIC',
            moderationStatus: 'APPROVED',
            createdAt: t(2),
            updatedAt: t(3),
          },
          {
            _id: p2,
            authorId: hex(u2),
            type: 'REPOST',
            originalPostId: hex(p1),
            caption: 'must read',
            content: '',
            tagIds: [],
            createdAt: t(3),
            updatedAt: t(3),
          },
          // author user does not exist
          {
            _id: p3,
            authorId: hex(ghost),
            content: 'orphan',
            tagIds: [hex(t1)],
            createdAt: t(3),
          },
          // repost of the skipped post
          {
            _id: p4,
            authorId: hex(u2),
            type: 'REPOST',
            originalPostId: hex(p3),
            createdAt: t(4),
          },
          // legacy document: nothing but id, author and content
          {
            _id: p5,
            authorId: hex(u2),
            content: 'legacy',
            tagIds: [hex(missingTag)],
          },
        ],
        comments: [
          {
            _id: oid(),
            postId: hex(p1),
            authorId: hex(u2),
            content: 'nice',
            createdAt: t(4),
          },
          {
            _id: oid(),
            postId: hex(p3),
            authorId: hex(u2),
            content: 'on skipped post',
          },
          {
            _id: oid(),
            postId: hex(p1),
            authorId: hex(ghost),
            content: 'ghost author',
          },
          { _id: oid(), postId: hex(p1), authorId: hex(u1), content: '' },
        ],
        reactions: [
          {
            _id: oid(),
            postId: hex(p1),
            userId: hex(u2),
            type: 'love',
            icon: 'heart',
          },
          { _id: oid(), postId: hex(p1), userId: hex(u1), type: 'like' },
          { _id: oid(), postId: hex(p3), userId: hex(u1), type: 'like' },
        ],
        bookmarks: [
          { _id: oid(), postId: hex(p1), userId: hex(u2) },
          { _id: oid(), postId: hex(oid()), userId: hex(u2) },
        ],
      },
    };
  };

  it('migrates a realistic dataset, skips orphans with reasons, and is idempotent', async () => {
    const { ids, data } = build();
    const source = new FakeSource(data);
    // batch=2 forces several batches per collection
    const run = () => runMigrators(scoped(), source, prisma, { batchSize: 2 });

    const results = await run();
    const by = Object.fromEntries(results.map((r) => [r.name, r]));
    // eslint-disable-next-line no-console
    if (process.env.DEBUG_MIGRATION) console.log(formatReport(results));

    expect(hasFailures(results)).toBe(false);
    for (const r of results)
      expect([r.name, r.verified]).toEqual([r.name, true]);

    expect(by.users).toMatchObject({ written: 2, skipped: 0 });
    expect(by.categories).toMatchObject({ written: 1 });
    expect(by.tags).toMatchObject({ written: 2 });

    expect(by.friendships).toMatchObject({ read: 4, written: 1, skipped: 3 });
    expect(by.friendships.skipReasons).toEqual({
      'user missing': 1,
      'reverse edge already migrated for this pair': 1,
    });

    // p1 + repost p2 + legacy p5; p3 (ghost author) and p4 (repost of p3) skipped
    expect(by.posts).toMatchObject({ read: 5, written: 3, skipped: 2 });
    expect(by.posts.skipReasons).toEqual({
      'author user missing': 1,
      'original post missing': 1,
    });

    // only p1 keeps links (two real tags); the rest have none or only dangling ones
    expect(by.post_tags.targetCount).toBe(1);
    expect(by.post_tags.skipReasons).toEqual({
      'post has no tags': 1,
      'post not migrated': 2,
      'none of the post tags exist': 1,
    });

    expect(by.comments).toMatchObject({ read: 4, written: 1, skipped: 3 });
    expect(by.comments.skipReasons).toEqual({
      'post missing': 1,
      'user missing': 1,
    });
    expect(by.reactions).toMatchObject({ written: 2, skipped: 1 });
    expect(by.reactions.skipReasons).toEqual({ 'post missing': 1 });
    expect(by.bookmarks).toMatchObject({ written: 1, skipped: 1 });

    // ---- the stored rows
    const p1 = await prisma.post.findUniqueOrThrow({
      where: { id: ids.p1.toHexString() },
      include: { tags: true },
    });
    expect(p1).toMatchObject({
      authorId: ids.u1.toHexString(),
      type: 'ORIGINAL',
      title: 'First',
      imageUrls: ['a.png'],
      categoryId: ids.cat.toHexString(),
      viewCount: 4,
      shareCount: 1,
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
    });
    expect(p1.createdAt).toEqual(new Date('2024-05-02T00:00:00.000Z'));
    expect(p1.updatedAt).toEqual(new Date('2024-05-03T00:00:00.000Z'));
    expect(p1.tags.map((t) => t.tagId).sort()).toEqual(
      [ids.t1.toHexString(), ids.t2.toHexString()].sort(),
    );

    const repost = await prisma.post.findUniqueOrThrow({
      where: { id: ids.p2.toHexString() },
    });
    expect(repost).toMatchObject({
      type: 'REPOST',
      originalPostId: ids.p1.toHexString(),
      caption: 'must read',
    });

    const legacy = await prisma.post.findUniqueOrThrow({
      where: { id: ids.p5.toHexString() },
    });
    expect(legacy).toMatchObject({
      type: 'ORIGINAL',
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
      isPublished: true,
      viewCount: 0,
      title: null,
    });

    const edge = await prisma.friendship.findFirstOrThrow({
      where: { user: own },
    });
    expect(edge).toMatchObject({
      userId: ids.u1.toHexString(),
      friendId: ids.u2.toHexString(),
      status: 'accepted',
    });

    const love = await prisma.reaction.findFirstOrThrow({
      where: { userId: ids.u2.toHexString() },
    });
    expect(love).toMatchObject({ type: 'love', icon: 'heart' });

    // ---- re-running converges on the same state
    const second = await run();
    expect(hasFailures(second)).toBe(false);
    for (const r of second)
      expect([r.name, r.verified]).toEqual([r.name, true]);
    expect(await prisma.post.count({ where: { author: own } })).toBe(3);
    expect(
      await prisma.comment.count({ where: { post: { author: own } } }),
    ).toBe(1);
    expect(
      await prisma.postTag.count({ where: { post: { author: own } } }),
    ).toBe(2);
  });
});
