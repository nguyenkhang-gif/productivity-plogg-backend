import { newObjectId } from 'src/shared/database/object-id';
import { Reaction } from 'src/modules/social/reaction/domain/reaction.entity';
import { Comment } from 'src/modules/social/comment/domain/comment.entity';
import type { ReactionRepository } from 'src/modules/social/reaction/domain/reaction.repository.interface';
import type { BookmarkRepository } from 'src/modules/social/bookmark/domain/bookmark.repository.interface';
import type { CommentRepository } from 'src/modules/social/comment/domain/comment.repository.interface';

export interface EngagementSeed {
  user(): Promise<{
    id: string;
    fullName: string;
    username: string;
    profilePic?: string;
  }>;
  /** A published post by `authorId`; returns its id. */
  post(authorId: string): Promise<string>;
}

export interface ReactionHarness {
  repo: ReactionRepository;
  seed: EngagementSeed;
  cleanup(): Promise<void>;
}
export interface BookmarkHarness {
  repo: BookmarkRepository;
  seed: EngagementSeed;
  cleanup(): Promise<void>;
}
export interface CommentHarness {
  repo: CommentRepository;
  seed: EngagementSeed;
  cleanup(): Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function describeReactionRepositoryContract(
  name: string,
  factory: () => Promise<ReactionHarness>,
): void {
  describe(`ReactionRepository contract: ${name}`, () => {
    let h: ReactionHarness;
    beforeAll(async () => {
      h = await factory();
    });
    afterAll(async () => {
      await h.cleanup();
    });

    const setup = async () => {
      const author = await h.seed.user();
      const voter = await h.seed.user();
      const postId = await h.seed.post(author.id);
      return { author, voter, postId };
    };

    it('save creates a reaction; findByPostAndUser returns it', async () => {
      const { voter, postId } = await setup();
      expect(await h.repo.findByPostAndUser(postId, voter.id)).toBeNull();

      const saved = await h.repo.save(
        new Reaction({ postId, userId: voter.id, type: 'like', icon: '👍' }),
      );
      expect(saved.id).toMatch(/^[0-9a-f]{24}$/);
      expect(saved).toMatchObject({
        postId,
        userId: voter.id,
        type: 'like',
        icon: '👍',
      });
      expect(saved.createdAt).toBeInstanceOf(Date);

      expect(await h.repo.findByPostAndUser(postId, voter.id)).toEqual(saved);
      expect(await h.repo.findByPostAndUser(postId, newObjectId())).toBeNull();
    });

    it('save is an idempotent upsert: one reaction per (post, user)', async () => {
      const { voter, postId } = await setup();
      const first = await h.repo.save(
        new Reaction({ postId, userId: voter.id, type: 'like', icon: 'a' }),
      );
      await sleep(5);
      const second = await h.repo.save(
        new Reaction({ postId, userId: voter.id, type: 'love', icon: 'b' }),
      );
      expect(second.id).toBe(first.id);
      expect(second).toMatchObject({ type: 'love', icon: 'b' });
      expect(second.updatedAt!.getTime()).toBeGreaterThan(
        first.updatedAt!.getTime(),
      );

      const same = await h.repo.save(
        new Reaction({ postId, userId: voter.id, type: 'love', icon: 'b' }),
      );
      expect(same.id).toBe(first.id);
      expect((await h.repo.findByPostAndUser(postId, voter.id))!.type).toBe(
        'love',
      );
    });

    it('different users and posts keep separate reactions', async () => {
      const { author, voter, postId } = await setup();
      const other = await h.seed.post(author.id);
      const a = await h.repo.save(
        new Reaction({ postId, userId: voter.id, type: 'like' }),
      );
      const b = await h.repo.save(
        new Reaction({ postId: other, userId: voter.id, type: 'like' }),
      );
      const c = await h.repo.save(
        new Reaction({ postId, userId: author.id, type: 'like' }),
      );
      expect(new Set([a.id, b.id, c.id]).size).toBe(3);
    });

    it('deleteByPostAndUser is idempotent', async () => {
      const { voter, postId } = await setup();
      await h.repo.save(
        new Reaction({ postId, userId: voter.id, type: 'like' }),
      );
      await h.repo.deleteByPostAndUser(postId, voter.id);
      expect(await h.repo.findByPostAndUser(postId, voter.id)).toBeNull();
      await expect(
        h.repo.deleteByPostAndUser(postId, voter.id),
      ).resolves.toBeUndefined();
    });
  });
}

export function describeBookmarkRepositoryContract(
  name: string,
  factory: () => Promise<BookmarkHarness>,
): void {
  describe(`BookmarkRepository contract: ${name}`, () => {
    let h: BookmarkHarness;
    beforeAll(async () => {
      h = await factory();
    });
    afterAll(async () => {
      await h.cleanup();
    });

    it('upsert is idempotent; countByUser counts distinct posts', async () => {
      const author = await h.seed.user();
      const me = await h.seed.user();
      const p1 = await h.seed.post(author.id);
      const p2 = await h.seed.post(author.id);

      expect(await h.repo.countByUser(me.id)).toBe(0);
      await h.repo.upsert(me.id, p1);
      await h.repo.upsert(me.id, p1);
      await h.repo.upsert(me.id, p1);
      expect(await h.repo.countByUser(me.id)).toBe(1);
      await h.repo.upsert(me.id, p2);
      expect(await h.repo.countByUser(me.id)).toBe(2);
      expect(await h.repo.countByUser(author.id)).toBe(0);
    });

    it('upsert tolerates concurrent calls', async () => {
      const author = await h.seed.user();
      const me = await h.seed.user();
      const p = await h.seed.post(author.id);
      await Promise.all(
        Array.from({ length: 5 }, () => h.repo.upsert(me.id, p)),
      );
      expect(await h.repo.countByUser(me.id)).toBe(1);
    });

    it('delete removes the bookmark and is idempotent', async () => {
      const author = await h.seed.user();
      const me = await h.seed.user();
      const p = await h.seed.post(author.id);
      await h.repo.upsert(me.id, p);
      await h.repo.delete(me.id, p);
      expect(await h.repo.countByUser(me.id)).toBe(0);
      await expect(h.repo.delete(me.id, p)).resolves.toBeUndefined();
    });

    it('getBookmarkedPostIds returns only the viewer’s bookmarks among the given posts', async () => {
      const author = await h.seed.user();
      const me = await h.seed.user();
      const other = await h.seed.user();
      const p1 = await h.seed.post(author.id);
      const p2 = await h.seed.post(author.id);
      const p3 = await h.seed.post(author.id);
      await h.repo.upsert(me.id, p1);
      await h.repo.upsert(me.id, p3);
      await h.repo.upsert(other.id, p2);

      const got = await h.repo.getBookmarkedPostIds(me.id, [
        p1,
        p2,
        newObjectId(),
      ]);
      expect([...got]).toEqual([p1]);
      expect((await h.repo.getBookmarkedPostIds(me.id, [])).size).toBe(0);
      expect(
        [...(await h.repo.getBookmarkedPostIds(me.id, [p1, p2, p3]))].sort(),
      ).toEqual([p1, p3].sort());
    });
  });
}

export function describeCommentRepositoryContract(
  name: string,
  factory: () => Promise<CommentHarness>,
): void {
  describe(`CommentRepository contract: ${name}`, () => {
    let h: CommentHarness;
    beforeAll(async () => {
      h = await factory();
    });
    afterAll(async () => {
      await h.cleanup();
    });

    const comment = (
      postId: string,
      authorId: string,
      content: string,
      iconUrl?: string,
    ) => new Comment({ postId, authorId, content, iconUrl });

    it('create returns the comment with its author card', async () => {
      const author = await h.seed.user();
      const commenter = await h.seed.user();
      const postId = await h.seed.post(author.id);

      const created = await h.repo.create(
        comment(postId, commenter.id, 'nice post', 'https://img/x.gif'),
      );
      expect(created.id).toMatch(/^[0-9a-f]{24}$/);
      expect(created).toMatchObject({
        postId,
        authorId: commenter.id,
        content: 'nice post',
        iconUrl: 'https://img/x.gif',
      });
      expect(created.author).toMatchObject({
        id: commenter.id,
        fullName: commenter.fullName,
        username: commenter.username,
      });
      expect(created.createdAt).toBeInstanceOf(Date);

      const bare = await h.repo.create(comment(postId, commenter.id, 'plain'));
      expect(bare.iconUrl).toBeUndefined();
    });

    it('findById returns the comment with author, null when unknown', async () => {
      const author = await h.seed.user();
      const postId = await h.seed.post(author.id);
      const created = await h.repo.create(comment(postId, author.id, 'hi'));
      const found = await h.repo.findById(created.id);
      expect(found).toMatchObject({ id: created.id, content: 'hi' });
      expect(found!.author).toMatchObject({ id: author.id });
      expect(await h.repo.findById(newObjectId())).toBeNull();
      expect(await h.repo.findById('nope')).toBeNull();
    });

    it('findByPost pages newest first with totals and can exclude authors', async () => {
      const author = await h.seed.user();
      const blocked = await h.seed.user();
      const postId = await h.seed.post(author.id);
      const otherPost = await h.seed.post(author.id);
      const made = [];
      for (let i = 0; i < 4; i++) {
        made.push(await h.repo.create(comment(postId, author.id, `c${i}`)));
        await sleep(3);
      }
      const fromBlocked = await h.repo.create(
        comment(postId, blocked.id, 'hidden'),
      );
      await h.repo.create(comment(otherPost, author.id, 'elsewhere'));

      const newestFirst = [fromBlocked, ...[...made].reverse()].map(
        (c) => c.id,
      );
      const p1 = await h.repo.findByPost(postId, 1, 2);
      expect(p1.items.map((c) => c.id)).toEqual(newestFirst.slice(0, 2));
      expect(p1.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
      expect(p1.items[0].author).toMatchObject({ id: blocked.id });
      const p3 = await h.repo.findByPost(postId, 3, 2);
      expect(p3.items.map((c) => c.id)).toEqual(newestFirst.slice(4));

      const filtered = await h.repo.findByPost(postId, 1, 10, [blocked.id]);
      expect(filtered.items.map((c) => c.id)).toEqual(
        [...made].reverse().map((c) => c.id),
      );
      expect(filtered.pagination.total).toBe(4);
      expect(filtered.pagination.totalPages).toBe(1);

      const empty = await h.repo.findByPost(newObjectId(), 1, 10);
      expect(empty).toEqual({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    });

    it('update changes the content and returns it without an author', async () => {
      const author = await h.seed.user();
      const postId = await h.seed.post(author.id);
      const created = await h.repo.create(comment(postId, author.id, 'before'));
      await sleep(5);
      const updated = await h.repo.update(created.id, 'after');
      expect(updated).toMatchObject({
        id: created.id,
        postId,
        authorId: author.id,
        content: 'after',
      });
      expect(updated.author).toBeUndefined();
      expect(updated.updatedAt!.getTime()).toBeGreaterThan(
        created.updatedAt!.getTime(),
      );
      expect((await h.repo.findById(created.id))!.content).toBe('after');
      await expect(h.repo.update(newObjectId(), 'x')).rejects.toThrow(
        'Comment not found',
      );
    });

    it('delete removes the comment; unknown ids throw NotFound', async () => {
      const author = await h.seed.user();
      const postId = await h.seed.post(author.id);
      const created = await h.repo.create(comment(postId, author.id, 'bye'));
      await h.repo.delete(created.id);
      expect(await h.repo.findById(created.id)).toBeNull();
      await expect(h.repo.delete(created.id)).rejects.toThrow(
        'Comment not found',
      );
    });
  });
}
