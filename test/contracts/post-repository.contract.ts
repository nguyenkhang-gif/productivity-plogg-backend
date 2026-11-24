import { ForbiddenException } from '@nestjs/common';
import { newObjectId } from 'src/shared/database/object-id';
import {
  Post,
  PostModerationStatus,
  PostVisibility,
} from 'src/modules/social/post/domain/post.entity';
import type { PostRepository } from 'src/modules/social/post/domain/post.repository.interface';

export type FriendshipSeedStatus = 'pending' | 'accepted' | 'blocked';

/** Cross-feature rows the post repository reads; created straight in the store. */
export interface PostSeed {
  user(opts?: { isPrivate?: boolean }): Promise<string>;
  friendship(
    userId: string,
    friendId: string,
    status: FriendshipSeedStatus,
  ): Promise<void>;
  category(): Promise<string>;
  tag(): Promise<{ id: string; slug: string }>;
  reaction(postId: string, userId: string, type?: string): Promise<void>;
  comment(postId: string, authorId: string): Promise<void>;
  bookmark(userId: string, postId: string): Promise<void>;
}

export interface PostRepositoryHarness {
  repo: PostRepository;
  seed: PostSeed;
  /** Must delete every row created through `seed` and `repo`. */
  cleanup(): Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sorted = (ids: string[]) => [...ids].sort();

/**
 * Behaviour every PostRepository implementation (Mongo, Prisma, ...) must
 * satisfy: feed visibility, moderation, ordering/pagination, counts, admin
 * search, repost bookkeeping and embeds. Each test builds its own users and
 * category so it tolerates a shared database.
 */
export function describePostRepositoryContract(
  name: string,
  factory: () => Promise<PostRepositoryHarness>,
): void {
  describe(`PostRepository contract: ${name}`, () => {
    let h: PostRepositoryHarness;
    let repo: PostRepository;
    let seed: PostSeed;

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
      seed = h.seed;
    });

    afterAll(async () => {
      await h.cleanup();
    });

    const mk = (authorId: string, overrides: Partial<Post> = {}) =>
      new Post({
        authorId,
        type: 'ORIGINAL',
        content: 'hello world',
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
        isPublished: true,
        reactCount: 0,
        shareCount: 0,
        imageUrls: [],
        tagIds: [],
        ...overrides,
      });

    const ids = (posts: Post[]) => posts.map((p) => p.id);

    /** author, friend of author, stranger; optionally a private-account author. */
    const world = async (authorPrivate = false) => {
      const author = await seed.user({ isPrivate: authorPrivate });
      const friend = await seed.user();
      const stranger = await seed.user();
      await seed.friendship(author, friend, 'accepted');
      // a pending request is not a friendship
      await seed.friendship(stranger, author, 'pending');
      const categoryId = await seed.category();
      return { author, friend, stranger, categoryId };
    };

    /** One post per visibility / moderation combination for `author`. */
    const matrixPosts = async (author: string, categoryId: string) => {
      const make = (
        visibility: PostVisibility,
        moderationStatus: PostModerationStatus,
      ) =>
        repo.create(mk(author, { visibility, moderationStatus, categoryId }));
      const pubApproved = await make('PUBLIC', 'APPROVED');
      await sleep(3);
      const pubPending = await make('PUBLIC', 'PENDING');
      await sleep(3);
      const pubRejected = await make('PUBLIC', 'REJECTED');
      await sleep(3);
      const friends = await make('FRIENDS', 'APPROVED');
      await sleep(3);
      const priv = await make('PRIVATE', 'APPROVED');
      return { pubApproved, pubPending, pubRejected, friends, priv };
    };

    describe('create / findById', () => {
      it('persists a post with its author, category, tags and zero counts', async () => {
        const author = await seed.user();
        const categoryId = await seed.category();
        const t1 = await seed.tag();
        const t2 = await seed.tag();

        const created = await repo.create(
          mk(author, {
            title: 'Title',
            content: 'Body',
            imageUrls: ['a.png', 'b.png'],
            categoryId,
            tagIds: [t1.id, t2.id],
          }),
        );

        expect(created.id).toMatch(/^[0-9a-f]{24}$/);
        expect(created).toMatchObject({
          authorId: author,
          type: 'ORIGINAL',
          title: 'Title',
          content: 'Body',
          imageUrls: ['a.png', 'b.png'],
          categoryId,
          visibility: 'PUBLIC',
          moderationStatus: 'APPROVED',
          isPublished: true,
          viewCount: 0,
          reactCount: 0,
          shareCount: 0,
          commentCount: 0,
          isBookmarked: false,
          userReaction: null,
          moderatedBy: null,
          moderatedAt: null,
          rejectionReason: null,
        });
        expect(sorted(created.tagIds!)).toEqual(sorted([t1.id, t2.id]));
        expect(created.tags!.map((t) => t.slug).sort()).toEqual(
          [t1.slug, t2.slug].sort(),
        );
        expect(created.category).toMatchObject({ id: categoryId });
        expect(created.author).toMatchObject({ id: author });
        expect(created.author!.fullName).toEqual(expect.any(String));
        expect(created.author!.username).toEqual(expect.any(String));
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);
      });

      it('defaults optional fields', async () => {
        const author = await seed.user();
        const created = await repo.create(
          new Post({ authorId: author, content: 'x' } as Partial<Post>),
        );
        expect(created).toMatchObject({
          type: 'ORIGINAL',
          visibility: 'PUBLIC',
          moderationStatus: 'APPROVED',
          isPublished: true,
          categoryId: null,
          tagIds: [],
          tags: [],
          category: null,
        });
        expect(created.title).toBeUndefined();
        expect(created.originalPostId).toBeUndefined();
      });

      it('findById returns null for unknown / invalid ids and unpublished posts', async () => {
        const author = await seed.user();
        const created = await repo.create(mk(author));
        // create/update return the viewer-visible read, so a draft yields null
        await repo.update(created.id, { isPublished: false }, author);
        const draft = created;
        expect(await repo.findById(newObjectId(), author)).toBeNull();
        expect(await repo.findById('not-an-id', author)).toBeNull();
        expect(await repo.findById(draft.id, author)).toBeNull();
        // the raw (moderator) read ignores publication
        expect((await repo.findByIdRaw(draft.id))?.id).toBe(draft.id);
        expect(await repo.findByIdRaw(newObjectId())).toBeNull();
      });

      it('findById returns null when the author is blocked', async () => {
        const { author, stranger, categoryId } = await world();
        const post = await repo.create(mk(author, { categoryId }));
        expect(
          await repo.findById(post.id, stranger, {
            blockedAuthorIds: [author],
          }),
        ).toBeNull();
        expect((await repo.findById(post.id, stranger))?.id).toBe(post.id);
      });
    });

    describe('findById visibility matrix', () => {
      type Outcome = 'ok' | 'forbidden' | 'null';
      type Actor = 'author' | 'friend' | 'stranger' | 'anon';
      type Key =
        | 'pubApproved'
        | 'pubPending'
        | 'pubRejected'
        | 'friends'
        | 'priv';

      const publicAccount: Record<Actor, Record<Key, Outcome>> = {
        author: {
          pubApproved: 'ok',
          pubPending: 'ok',
          pubRejected: 'ok',
          friends: 'ok',
          priv: 'ok',
        },
        friend: {
          pubApproved: 'ok',
          pubPending: 'forbidden',
          pubRejected: 'forbidden',
          friends: 'ok',
          priv: 'forbidden',
        },
        stranger: {
          pubApproved: 'ok',
          pubPending: 'forbidden',
          pubRejected: 'forbidden',
          friends: 'forbidden',
          priv: 'forbidden',
        },
        anon: {
          pubApproved: 'ok',
          pubPending: 'forbidden',
          pubRejected: 'forbidden',
          friends: 'forbidden',
          priv: 'forbidden',
        },
      };

      const privateAccount: Record<Actor, Record<Key, Outcome>> = {
        author: publicAccount.author,
        friend: publicAccount.friend,
        // a private account is invisible (404, not 403) to non-friends
        stranger: {
          pubApproved: 'null',
          pubPending: 'null',
          pubRejected: 'null',
          friends: 'null',
          priv: 'null',
        },
        anon: {
          pubApproved: 'null',
          pubPending: 'null',
          pubRejected: 'null',
          friends: 'null',
          priv: 'null',
        },
      };

      const check = async (
        isPrivate: boolean,
        expected: Record<Actor, Record<Key, Outcome>>,
      ) => {
        const w = await world(isPrivate);
        const posts = await matrixPosts(w.author, w.categoryId);
        const viewers: Record<Actor, string | undefined> = {
          author: w.author,
          friend: w.friend,
          stranger: w.stranger,
          anon: undefined,
        };
        for (const actor of Object.keys(viewers) as Actor[]) {
          for (const key of Object.keys(posts) as Key[]) {
            const label = `${isPrivate ? 'private' : 'public'} account / ${actor} / ${key}`;
            const call = repo.findById(posts[key].id, viewers[actor]);
            switch (expected[actor][key]) {
              case 'ok':
                expect((await call)?.id).toBe(posts[key].id);
                break;
              case 'null':
                expect([label, await call]).toEqual([label, null]);
                break;
              case 'forbidden':
                await expect(call).rejects.toBeInstanceOf(ForbiddenException);
                break;
            }
          }
        }
      };

      it('public account: author / friend / stranger / anonymous', () =>
        check(false, publicAccount));

      it('private account: only the author and friends can see it', () =>
        check(true, privateAccount));

      it('explains why in the Forbidden message', async () => {
        const w = await world();
        const posts = await matrixPosts(w.author, w.categoryId);
        await expect(
          repo.findById(posts.pubPending.id, w.stranger),
        ).rejects.toThrow('awaiting moderation');
        await expect(repo.findById(posts.priv.id, w.stranger)).rejects.toThrow(
          'private',
        );
        await expect(
          repo.findById(posts.friends.id, w.stranger),
        ).rejects.toThrow('friends only');
      });
    });

    describe('listings visibility (feed, trending, author page, embed)', () => {
      type Viewer = 'author' | 'friend' | 'stranger';
      type Key =
        | 'pubApproved'
        | 'pubPending'
        | 'pubRejected'
        | 'friends'
        | 'priv';

      const expectedFeed = (
        isPrivateAccount: boolean,
      ): Record<Viewer, Key[]> => ({
        author: ['pubApproved', 'pubPending', 'pubRejected', 'friends', 'priv'],
        friend: ['pubApproved', 'friends'],
        stranger: isPrivateAccount ? [] : ['pubApproved'],
      });

      const scenario = async (isPrivateAccount: boolean) => {
        const w = await world(isPrivateAccount);
        const posts = await matrixPosts(w.author, w.categoryId);
        const viewerId: Record<Viewer, string> = {
          author: w.author,
          friend: w.friend,
          stranger: w.stranger,
        };
        return { w, posts, viewerId };
      };

      const idsOf = (posts: Record<Key, Post>, keys: Key[]): string[] =>
        sorted(keys.map((k) => posts[k].id));

      for (const isPrivateAccount of [false, true]) {
        const label = isPrivateAccount ? 'private account' : 'public account';

        it(`findAll (${label})`, async () => {
          const { w, posts, viewerId } = await scenario(isPrivateAccount);
          for (const viewer of ['author', 'friend', 'stranger'] as Viewer[]) {
            const res = await repo.findAll(1, 50, viewerId[viewer], {
              categoryId: w.categoryId,
            });
            const want = idsOf(posts, expectedFeed(isPrivateAccount)[viewer]);
            expect([viewer, sorted(ids(res.items))]).toEqual([viewer, want]);
            expect(res.pagination.total).toBe(want.length);
          }
        });

        it(`findTrending (${label})`, async () => {
          const { posts, viewerId } = await scenario(isPrivateAccount);
          const mine = new Set(Object.values(posts).map((p) => p.id));
          for (const viewer of ['author', 'friend', 'stranger'] as Viewer[]) {
            const res = await repo.findTrending(1000, viewerId[viewer]);
            const got = ids(res).filter((id) => mine.has(id));
            const want = idsOf(posts, expectedFeed(isPrivateAccount)[viewer]);
            expect([viewer, sorted(got)]).toEqual([viewer, want]);
          }
        });

        it(`findManyForEmbed (${label})`, async () => {
          const { posts, viewerId } = await scenario(isPrivateAccount);
          const all = Object.values(posts).map((p) => p.id);
          for (const viewer of ['author', 'friend', 'stranger'] as Viewer[]) {
            const cards = await repo.findManyForEmbed(all, viewerId[viewer]);
            const want = idsOf(posts, expectedFeed(isPrivateAccount)[viewer]);
            expect([viewer, sorted(cards.map((c) => c.id))]).toEqual([
              viewer,
              want,
            ]);
          }
        });

        it(`findByAuthor (${label})`, async () => {
          const { w, posts, viewerId } = await scenario(isPrivateAccount);
          for (const viewer of ['author', 'friend', 'stranger'] as Viewer[]) {
            const res = await repo.findByAuthor(
              w.author,
              1,
              50,
              viewerId[viewer],
            );
            const want = idsOf(posts, expectedFeed(isPrivateAccount)[viewer]);
            expect([viewer, sorted(ids(res.items))]).toEqual([viewer, want]);
            expect(res.pagination.total).toBe(want.length);
          }
        });
      }

      it('blocked authors are excluded from feed, trending and embeds', async () => {
        const { w, posts, viewerId } = await scenario(false);
        const feed = await repo.findAll(1, 50, viewerId.friend, {
          categoryId: w.categoryId,
          blockedAuthorIds: [w.author],
        });
        expect(feed.items).toEqual([]);
        expect(feed.pagination.total).toBe(0);

        const trending = await repo.findTrending(1000, viewerId.friend, [
          w.author,
        ]);
        const mine = new Set(Object.values(posts).map((p) => p.id));
        expect(ids(trending).filter((id) => mine.has(id))).toEqual([]);

        expect(
          await repo.findManyForEmbed(
            Object.values(posts).map((p) => p.id),
            viewerId.friend,
            [w.author],
          ),
        ).toEqual([]);
      });

      it('unpublished posts never appear in listings', async () => {
        const w = await world();
        await repo.create(
          mk(w.author, { isPublished: false, categoryId: w.categoryId }),
        );
        const res = await repo.findAll(1, 10, w.author, {
          categoryId: w.categoryId,
        });
        expect(res.items).toEqual([]);
        const own = await repo.findByAuthor(w.author, 1, 10, w.author);
        expect(own.items).toEqual([]);
      });

      it('reposts are not part of the feed or the author page', async () => {
        const w = await world();
        const original = await repo.create(
          mk(w.author, { categoryId: w.categoryId }),
        );
        await repo.create(
          mk(w.friend, {
            type: 'REPOST',
            originalPostId: original.id,
            caption: 'look',
            content: '',
            categoryId: w.categoryId,
          }),
        );
        const feed = await repo.findAll(1, 10, w.friend, {
          categoryId: w.categoryId,
        });
        expect(ids(feed.items)).toEqual([original.id]);
        const page = await repo.findByAuthor(w.friend, 1, 10, w.friend);
        expect(page.items).toEqual([]);
      });
    });

    describe('feed filters, order and pagination', () => {
      it('orders newest first with correct totals and pages', async () => {
        const w = await world();
        const created: Post[] = [];
        for (let i = 0; i < 5; i++) {
          created.push(
            await repo.create(
              mk(w.author, { content: `p${i}`, categoryId: w.categoryId }),
            ),
          );
          await sleep(3);
        }
        const newestFirst = ids([...created].reverse());

        const p1 = await repo.findAll(1, 2, w.stranger, {
          categoryId: w.categoryId,
        });
        const p2 = await repo.findAll(2, 2, w.stranger, {
          categoryId: w.categoryId,
        });
        const p3 = await repo.findAll(3, 2, w.stranger, {
          categoryId: w.categoryId,
        });
        const p4 = await repo.findAll(4, 2, w.stranger, {
          categoryId: w.categoryId,
        });
        expect(ids(p1.items)).toEqual(newestFirst.slice(0, 2));
        expect(ids(p2.items)).toEqual(newestFirst.slice(2, 4));
        expect(ids(p3.items)).toEqual(newestFirst.slice(4));
        expect(p4.items).toEqual([]);
        expect(p1.pagination).toEqual({
          page: 1,
          limit: 2,
          total: 5,
          totalPages: 3,
        });
        expect(p4.pagination.total).toBe(5);

        const byAuthor = await repo.findByAuthor(w.author, 1, 3, w.stranger);
        expect(ids(byAuthor.items)).toEqual(newestFirst.slice(0, 3));
        expect(byAuthor.pagination).toEqual({
          page: 1,
          limit: 3,
          total: 5,
          totalPages: 2,
        });
      });

      it('sortByUpdatedAt orders by updatedAt in the requested direction', async () => {
        const w = await world();
        const a = await repo.create(mk(w.author, { categoryId: w.categoryId }));
        await sleep(5);
        const b = await repo.create(mk(w.author, { categoryId: w.categoryId }));
        await sleep(5);
        await repo.update(a.id, { title: 'touched' }, w.author);

        const asc = await repo.findAll(1, 10, w.stranger, {
          categoryId: w.categoryId,
          sortByUpdatedAt: 1,
        });
        const desc = await repo.findAll(1, 10, w.stranger, {
          categoryId: w.categoryId,
          sortByUpdatedAt: -1,
        });
        expect(ids(asc.items)).toEqual([b.id, a.id]);
        expect(ids(desc.items)).toEqual([a.id, b.id]);
      });

      it('filters by category, tag slugs and excludeId', async () => {
        const w = await world();
        const otherCategory = await seed.category();
        const tag = await seed.tag();
        const tagged = await repo.create(
          mk(w.author, { categoryId: w.categoryId, tagIds: [tag.id] }),
        );
        const plain = await repo.create(
          mk(w.author, { categoryId: w.categoryId }),
        );
        const elsewhere = await repo.create(
          mk(w.author, { categoryId: otherCategory, tagIds: [tag.id] }),
        );

        const inCategory = await repo.findAll(1, 10, w.stranger, {
          categoryId: w.categoryId,
        });
        expect(sorted(ids(inCategory.items))).toEqual(
          sorted([tagged.id, plain.id]),
        );

        const byTag = await repo.findAll(1, 10, w.stranger, {
          categoryId: w.categoryId,
          tags: [tag.slug],
        });
        expect(ids(byTag.items)).toEqual([tagged.id]);

        const byTagAcross = await repo.findAll(1, 10, w.author, {
          tags: [tag.slug],
        });
        expect(sorted(ids(byTagAcross.items))).toEqual(
          sorted([tagged.id, elsewhere.id]),
        );

        const excluded = await repo.findAll(1, 10, w.stranger, {
          categoryId: w.categoryId,
          excludeId: tagged.id,
        });
        expect(ids(excluded.items)).toEqual([plain.id]);
        expect(excluded.pagination.total).toBe(1);
      });
    });

    describe('computed counts and viewer state', () => {
      it('reactCount, commentCount, userReaction and isBookmarked per viewer', async () => {
        const w = await world();
        const post = await repo.create(
          mk(w.author, { categoryId: w.categoryId }),
        );
        await seed.reaction(post.id, w.friend, 'love');
        await seed.reaction(post.id, w.stranger, 'like');
        await seed.comment(post.id, w.friend);
        await seed.comment(post.id, w.stranger);
        await seed.comment(post.id, w.stranger);
        await seed.bookmark(w.stranger, post.id);

        const asStranger = await repo.findById(post.id, w.stranger);
        expect(asStranger).toMatchObject({
          reactCount: 2,
          commentCount: 3,
          isBookmarked: true,
        });
        expect(asStranger!.userReaction).toMatchObject({ type: 'like' });

        const asFriend = await repo.findById(post.id, w.friend);
        expect(asFriend!.isBookmarked).toBe(false);
        expect(asFriend!.userReaction).toMatchObject({ type: 'love' });

        const asAnon = await repo.findById(post.id);
        expect(asAnon).toMatchObject({
          reactCount: 2,
          commentCount: 3,
          isBookmarked: false,
          userReaction: null,
        });

        const feed = await repo.findAll(1, 10, w.stranger, {
          categoryId: w.categoryId,
        });
        expect(feed.items[0]).toMatchObject({
          id: post.id,
          reactCount: 2,
          commentCount: 3,
          isBookmarked: true,
        });
      });

      it('findTrending orders by reaction count, then newest', async () => {
        const w = await world();
        const voters = [w.friend, w.stranger, await seed.user()];
        const none = await repo.create(mk(w.author, { content: 'none' }));
        await sleep(3);
        const two = await repo.create(mk(w.author, { content: 'two' }));
        await sleep(3);
        const one = await repo.create(mk(w.author, { content: 'one' }));
        await sleep(3);
        const oneNewer = await repo.create(mk(w.author, { content: 'one b' }));
        await sleep(3);
        const three = await repo.create(mk(w.author, { content: 'three' }));
        await seed.reaction(two.id, voters[0]);
        await seed.reaction(two.id, voters[1]);
        await seed.reaction(one.id, voters[0]);
        await seed.reaction(oneNewer.id, voters[1]);
        for (const v of voters) await seed.reaction(three.id, v);

        const mine = new Set(
          [none, two, one, oneNewer, three].map((p) => p.id),
        );
        const res = await repo.findTrending(1000, w.stranger);
        expect(ids(res).filter((id) => mine.has(id))).toEqual([
          three.id,
          two.id,
          oneNewer.id,
          one.id,
          none.id,
        ]);
        expect(res.find((p) => p.id === three.id)!.reactCount).toBe(3);

        const limited = await repo.findTrending(1, w.stranger);
        expect(limited).toHaveLength(1);
      });

      it('getStatsByAuthor counts published posts, reactions and comments received', async () => {
        const w = await world();
        const a = await repo.create(mk(w.author));
        const b = await repo.create(mk(w.author, { visibility: 'PRIVATE' }));
        await repo.create(mk(w.author, { isPublished: false }));
        await seed.reaction(a.id, w.friend);
        await seed.reaction(a.id, w.stranger);
        await seed.reaction(b.id, w.friend);
        await seed.comment(b.id, w.stranger);

        expect(await repo.getStatsByAuthor(w.author)).toEqual({
          postCount: 2,
          totalReactionsReceived: 3,
          totalComments: 1,
        });
        expect(await repo.getStatsByAuthor(await seed.user())).toEqual({
          postCount: 0,
          totalReactionsReceived: 0,
          totalComments: 0,
        });
        // countByAuthor counts everything the author owns, drafts included
        expect(await repo.countByAuthor(w.author)).toBe(3);
      });
    });

    describe('moderation', () => {
      it('lists pending PUBLIC posts only, newest first', async () => {
        const w = await world();
        const first = await repo.create(
          mk(w.author, { moderationStatus: 'PENDING' }),
        );
        await sleep(3);
        const second = await repo.create(
          mk(w.author, { moderationStatus: 'PENDING' }),
        );
        await repo.create(mk(w.author, { moderationStatus: 'APPROVED' }));
        await repo.create(mk(w.author, { moderationStatus: 'REJECTED' }));
        await repo.create(
          mk(w.author, { visibility: 'FRIENDS', moderationStatus: 'PENDING' }),
        );

        const res = await repo.findPendingPublic(1, 1000);
        const mine = ids(res.items).filter(
          (id) => id === first.id || id === second.id,
        );
        expect(mine).toEqual([second.id, first.id]);
        expect(
          res.items.every(
            (p) =>
              p.visibility === 'PUBLIC' && p.moderationStatus === 'PENDING',
          ),
        ).toBe(true);
        expect(res.pagination.total).toBeGreaterThanOrEqual(2);
      });

      it('setModerationStatus records the verdict and clears the reason on approval', async () => {
        const w = await world();
        const mod = await seed.user();
        const post = await repo.create(
          mk(w.author, { moderationStatus: 'PENDING' }),
        );

        const rejected = await repo.setModerationStatus(
          post.id,
          'REJECTED',
          mod,
          'spam',
        );
        expect(rejected).toMatchObject({
          id: post.id,
          moderationStatus: 'REJECTED',
          moderatedBy: mod,
          rejectionReason: 'spam',
        });
        expect(rejected.moderatedAt).toBeInstanceOf(Date);

        const approved = await repo.setModerationStatus(
          post.id,
          'APPROVED',
          mod,
        );
        expect(approved).toMatchObject({
          moderationStatus: 'APPROVED',
          moderatedBy: mod,
          rejectionReason: null,
        });
        // now visible to strangers
        expect((await repo.findById(post.id, w.stranger))?.id).toBe(post.id);
      });

      it('setModerationStatus throws NotFound for unknown posts', async () => {
        await expect(
          repo.setModerationStatus(newObjectId(), 'APPROVED', newObjectId()),
        ).rejects.toThrow('Post not found');
      });
    });

    describe('findAllAdmin', () => {
      it('filters by author, status, visibility and escaped title search; omits content and reposts', async () => {
        const w = await world();
        const tag = newObjectId().slice(-6);
        const a = await repo.create(
          mk(w.author, { title: `Alpha ${tag}`, content: 'secret body' }),
        );
        await sleep(3);
        const b = await repo.create(
          mk(w.author, {
            title: `100% legit_${tag}`,
            visibility: 'FRIENDS',
          }),
        );
        await sleep(3);
        const c = await repo.create(
          mk(w.author, {
            title: `Gamma ${tag}`,
            moderationStatus: 'PENDING',
          }),
        );
        await repo.create(
          mk(w.friend, {
            type: 'REPOST',
            originalPostId: a.id,
            content: '',
            title: `Alpha ${tag} repost`,
          }),
        );
        const base = { page: 1, limit: 50 };

        const byAuthor = await repo.findAllAdmin({
          ...base,
          authorId: w.author,
        });
        expect(ids(byAuthor.items)).toEqual([c.id, b.id, a.id]);
        expect(byAuthor.pagination).toEqual({
          page: 1,
          limit: 50,
          total: 3,
          totalPages: 1,
        });
        expect(byAuthor.items.every((p) => !p.content)).toBe(true);
        expect(byAuthor.items[0].author).toMatchObject({ id: w.author });

        expect(
          ids(
            (
              await repo.findAllAdmin({
                ...base,
                authorId: w.author,
                search: `alpha ${tag}`,
              })
            ).items,
          ),
        ).toEqual([a.id]);
        // wildcards are literals
        expect(
          ids(
            (
              await repo.findAllAdmin({
                ...base,
                authorId: w.author,
                search: '100%',
              })
            ).items,
          ),
        ).toEqual([b.id]);
        expect(
          ids(
            (
              await repo.findAllAdmin({
                ...base,
                authorId: w.author,
                search: '%',
              })
            ).items,
          ),
        ).toEqual([b.id]);
        expect(
          (
            await repo.findAllAdmin({
              ...base,
              authorId: w.author,
              search: '_',
            })
          ).items.map((p) => p.id),
        ).toEqual([b.id]);
        expect(
          (
            await repo.findAllAdmin({
              ...base,
              authorId: w.author,
              search: 'legit.*',
            })
          ).items,
        ).toEqual([]);

        expect(
          ids(
            (
              await repo.findAllAdmin({
                ...base,
                authorId: w.author,
                moderationStatus: 'PENDING',
              })
            ).items,
          ),
        ).toEqual([c.id]);
        expect(
          ids(
            (
              await repo.findAllAdmin({
                ...base,
                authorId: w.author,
                visibility: 'FRIENDS',
              })
            ).items,
          ),
        ).toEqual([b.id]);

        const paged = await repo.findAllAdmin({
          page: 2,
          limit: 2,
          authorId: w.author,
        });
        expect(ids(paged.items)).toEqual([a.id]);
        expect(paged.pagination).toEqual({
          page: 2,
          limit: 2,
          total: 3,
          totalPages: 2,
        });
      });
    });

    describe('update / delete / counters', () => {
      it('update applies provided fields only and replaces tags', async () => {
        const w = await world();
        const t1 = await seed.tag();
        const t2 = await seed.tag();
        const post = await repo.create(
          mk(w.author, {
            title: 'T',
            content: 'C',
            categoryId: w.categoryId,
            tagIds: [t1.id],
          }),
        );

        const updated = await repo.update(
          post.id,
          {
            content: 'C2',
            imageUrls: ['x.png'],
            visibility: 'FRIENDS',
            tagIds: [t2.id],
            categoryId: null,
          },
          w.author,
        );
        expect(updated).toMatchObject({
          id: post.id,
          title: 'T',
          content: 'C2',
          imageUrls: ['x.png'],
          visibility: 'FRIENDS',
          categoryId: null,
          category: null,
          tagIds: [t2.id],
        });
        expect(updated.tags!.map((t) => t.id)).toEqual([t2.id]);

        const cleared = await repo.update(post.id, { tagIds: [] }, w.author);
        expect(cleared.tagIds).toEqual([]);
        expect(cleared.content).toBe('C2');

        const decided = await repo.update(
          post.id,
          {
            visibility: 'PUBLIC',
            moderationStatus: 'REJECTED',
            moderatedBy: w.friend,
            moderatedAt: new Date('2024-01-01T00:00:00.000Z'),
            rejectionReason: 'no',
          },
          w.author,
        );
        expect(decided).toMatchObject({
          moderationStatus: 'REJECTED',
          moderatedBy: w.friend,
          rejectionReason: 'no',
        });
        expect(decided.moderatedAt!.toISOString()).toBe(
          '2024-01-01T00:00:00.000Z',
        );

        await expect(
          repo.update(newObjectId(), { title: 'x' }, w.author),
        ).rejects.toThrow('Post not found');
      });

      it('delete removes the post; unknown ids throw NotFound', async () => {
        const w = await world();
        const post = await repo.create(mk(w.author));
        await repo.delete(post.id);
        expect(await repo.findByIdRaw(post.id)).toBeNull();
        await expect(repo.delete(post.id)).rejects.toThrow('Post not found');
        await expect(repo.delete(newObjectId())).rejects.toThrow(
          'Post not found',
        );
      });

      it('incrementViewCount adds one per call; unknown ids throw NotFound', async () => {
        const w = await world();
        const post = await repo.create(mk(w.author));
        await repo.incrementViewCount(post.id);
        await repo.incrementViewCount(post.id);
        expect((await repo.findByIdRaw(post.id))!.viewCount).toBe(2);
        await expect(repo.incrementViewCount(newObjectId())).rejects.toThrow(
          'Post not found',
        );
      });

      it('nullifyCategoryOnPosts detaches every post from the category', async () => {
        const w = await world();
        const a = await repo.create(mk(w.author, { categoryId: w.categoryId }));
        const b = await repo.create(mk(w.author, { categoryId: w.categoryId }));
        await repo.nullifyCategoryOnPosts(w.categoryId);
        for (const p of [a, b]) {
          const fresh = await repo.findByIdRaw(p.id);
          expect(fresh!.categoryId).toBeNull();
          expect(fresh!.category).toBeNull();
        }
      });
    });

    describe('reposts / shares', () => {
      it('tracks a repost per (original, user) and the share counter', async () => {
        const w = await world();
        const original = await repo.create(mk(w.author));

        expect(await repo.findRepostByUser(original.id, w.friend)).toBeNull();
        expect(await repo.getShareCount(original.id)).toBe(0);

        const repost = await repo.create(
          mk(w.friend, {
            type: 'REPOST',
            originalPostId: original.id,
            caption: 'must read',
            content: '',
          }),
        );
        expect(repost).toMatchObject({
          type: 'REPOST',
          originalPostId: original.id,
          caption: 'must read',
          authorId: w.friend,
        });

        const found = await repo.findRepostByUser(original.id, w.friend);
        expect(found).toMatchObject({
          id: repost.id,
          authorId: w.friend,
          type: 'REPOST',
          originalPostId: original.id,
          caption: 'must read',
        });
        expect(await repo.findRepostByUser(original.id, w.stranger)).toBeNull();

        await repo.incrementShareCount(original.id);
        await repo.incrementShareCount(original.id);
        await repo.decrementShareCount(original.id);
        expect(await repo.getShareCount(original.id)).toBe(1);
        expect((await repo.findByIdRaw(original.id))!.shareCount).toBe(1);

        await repo.delete(repost.id);
        expect(await repo.findRepostByUser(original.id, w.friend)).toBeNull();
        expect(await repo.getShareCount(newObjectId())).toBe(0);
      });

      it('rejects a second repost of the same post by the same user', async () => {
        const w = await world();
        const original = await repo.create(mk(w.author));
        const repost = () =>
          repo.create(
            mk(w.friend, {
              type: 'REPOST',
              originalPostId: original.id,
              content: '',
            }),
          );
        await repost();
        await expect(repost()).rejects.toBeDefined();
      });

      it('lets one user publish many ordinary posts', async () => {
        const w = await world();
        await repo.create(mk(w.author));
        await repo.create(mk(w.author));
        expect(await repo.countByAuthor(w.author)).toBe(2);
      });
    });

    describe('findManyForEmbed', () => {
      it('returns card fields, truncates the excerpt, ignores invalid ids', async () => {
        const w = await world();
        const long = 'é'.repeat(200);
        const post = await repo.create(
          mk(w.author, {
            title: 'Card',
            content: long,
            imageUrls: ['first.png', 'second.png'],
          }),
        );
        const bare = await repo.create(mk(w.author, { content: '' }));

        const cards = await repo.findManyForEmbed(
          [post.id, bare.id, 'garbage', newObjectId()],
          w.stranger,
        );
        const byId = new Map(cards.map((c) => [c.id, c]));
        expect(byId.size).toBe(2);
        expect(byId.get(post.id)).toMatchObject({
          id: post.id,
          title: 'Card',
          excerpt: 'é'.repeat(160),
          imageUrl: 'first.png',
          authorName: post.author!.fullName,
        });
        expect(byId.get(post.id)!.createdAt).toBeInstanceOf(Date);
        expect(byId.get(bare.id)).toMatchObject({
          title: null,
          excerpt: null,
          imageUrl: null,
        });

        expect(await repo.findManyForEmbed([], w.stranger)).toEqual([]);
        expect(await repo.findManyForEmbed(['garbage'], w.stranger)).toEqual(
          [],
        );
      });
    });
  });
}
