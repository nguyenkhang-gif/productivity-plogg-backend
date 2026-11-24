import 'dotenv/config';
if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run integration tests ' +
      'against an unknown database.',
  );
}

import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { PrismaPostRepository } from 'src/modules/social/post/infrastructure/post.prisma.repository';
import { PrismaFriendshipRepository } from 'src/modules/social/friendship/infrastructure/friendship.prisma.repository';
import { PrismaTagRepository } from 'src/modules/social/tag/infrastructure/tag.prisma.repository';
import { PrismaCategoryRepository } from 'src/modules/social/category/infrastructure/category.prisma.repository';
import { PrismaReactionRepository } from 'src/modules/social/reaction/infrastructure/reaction.prisma.repository';
import { PrismaBookmarkRepository } from 'src/modules/social/bookmark/infrastructure/bookmark.prisma.repository';
import { PrismaCommentRepository } from 'src/modules/social/comment/infrastructure/comment.prisma.repository';
import { PrismaUserRelations } from 'src/modules/identity/user/infrastructure/user-relations.prisma';
import { Post } from 'src/modules/social/post/domain/post.entity';
import { Comment } from 'src/modules/social/comment/domain/comment.entity';
import { Reaction } from 'src/modules/social/reaction/domain/reaction.entity';
import { describePostRepositoryContract } from '../contracts/post-repository.contract';
import { describeFriendshipRepositoryContract } from '../contracts/friendship-repository.contract';
import {
  describeCategoryRepositoryContract,
  describeTagRepositoryContract,
} from '../contracts/taxonomy-repository.contract';
import {
  describeBookmarkRepositoryContract,
  describeCommentRepositoryContract,
  describeReactionRepositoryContract,
} from '../contracts/engagement-repository.contract';

/** Everything this spec creates is namespaced so it never touches other specs' rows. */
const USER_PREFIX = 'sc_';
const SEED_SLUG_PREFIX = 'sc-';

const prisma = new PrismaService();

beforeAll(async () => {
  await prisma.onModuleInit();
});

afterAll(async () => {
  await prisma.onModuleDestroy();
});

let userCounter = 0;
const run = newObjectId().slice(-8);

async function createUser(isPrivate = false) {
  userCounter += 1;
  const n = `${run}_${userCounter}`;
  const row = await prisma.user.create({
    data: {
      id: newObjectId(),
      fullName: `Social User ${n}`,
      username: `${USER_PREFIX}${n}`,
      email: `${USER_PREFIX}${n}@example.com`,
      isPrivate,
    },
  });
  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    profilePic: row.profilePic ?? undefined,
  };
}

async function createPost(authorId: string) {
  const row = await prisma.post.create({
    data: { id: newObjectId(), authorId, content: 'seeded' },
  });
  return row.id;
}

const cleanupSocial = async () => {
  await prisma.user.deleteMany({
    where: { username: { startsWith: USER_PREFIX } },
  });
  await prisma.tag.deleteMany({
    where: { slug: { startsWith: SEED_SLUG_PREFIX } },
  });
  await prisma.tag.deleteMany({ where: { slug: { startsWith: 'tc-' } } });
  await prisma.category.deleteMany({
    where: { slug: { startsWith: SEED_SLUG_PREFIX } },
  });
  await prisma.category.deleteMany({ where: { slug: { startsWith: 'tc-' } } });
};

const engagementSeed = {
  user: () => createUser(),
  post: createPost,
};

describePostRepositoryContract('Prisma', async () => ({
  repo: new PrismaPostRepository(prisma),
  cleanup: cleanupSocial,
  seed: {
    user: async (opts) => (await createUser(opts?.isPrivate)).id,
    friendship: async (userId, friendId, status) => {
      await prisma.friendship.create({
        data: { id: newObjectId(), userId, friendId, status },
      });
    },
    category: async () => {
      const id = newObjectId();
      await prisma.category.create({
        data: { id, name: `Cat ${id}`, slug: `${SEED_SLUG_PREFIX}cat-${id}` },
      });
      return id;
    },
    tag: async () => {
      const id = newObjectId();
      const slug = `${SEED_SLUG_PREFIX}tag-${id}`;
      await prisma.tag.create({ data: { id, name: `Tag ${id}`, slug } });
      return { id, slug };
    },
    reaction: async (postId, userId, type = 'like') => {
      await prisma.reaction.create({
        data: { id: newObjectId(), postId, userId, type },
      });
    },
    comment: async (postId, authorId) => {
      await prisma.comment.create({
        data: { id: newObjectId(), postId, authorId, content: 'c' },
      });
    },
    bookmark: async (userId, postId) => {
      await prisma.bookmark.create({
        data: { id: newObjectId(), userId, postId },
      });
    },
  },
}));

describeFriendshipRepositoryContract('Prisma', async () => ({
  repo: new PrismaFriendshipRepository(prisma),
  user: () => createUser(),
  cleanup: cleanupSocial,
}));

describeTagRepositoryContract('Prisma', async () => ({
  repo: new PrismaTagRepository(prisma),
  cleanup: cleanupSocial,
}));

describeCategoryRepositoryContract('Prisma', async () => ({
  repo: new PrismaCategoryRepository(prisma),
  cleanup: cleanupSocial,
}));

describeReactionRepositoryContract('Prisma', async () => ({
  repo: new PrismaReactionRepository(prisma),
  seed: engagementSeed,
  cleanup: cleanupSocial,
}));

describeBookmarkRepositoryContract('Prisma', async () => ({
  repo: new PrismaBookmarkRepository(prisma),
  seed: engagementSeed,
  cleanup: cleanupSocial,
}));

describeCommentRepositoryContract('Prisma', async () => ({
  repo: new PrismaCommentRepository(prisma),
  seed: engagementSeed,
  cleanup: cleanupSocial,
}));

describe('social schema (Postgres specifics)', () => {
  afterAll(cleanupSocial);

  it('deleting a post cascades to comments, reactions, bookmarks, tag links and reposts', async () => {
    const posts = new PrismaPostRepository(prisma);
    const comments = new PrismaCommentRepository(prisma);
    const reactions = new PrismaReactionRepository(prisma);
    const author = await createUser();
    const fan = await createUser();
    const tag = await prisma.tag.create({
      data: {
        id: newObjectId(),
        name: 't',
        slug: `${SEED_SLUG_PREFIX}c-${newObjectId()}`,
      },
    });
    const post = await posts.create(
      new Post({ authorId: author.id, content: 'x', tagIds: [tag.id] }),
    );
    const repost = await posts.create(
      new Post({
        authorId: fan.id,
        type: 'REPOST',
        originalPostId: post.id,
        content: '',
      }),
    );
    await comments.create(
      new Comment({ postId: post.id, authorId: fan.id, content: 'c' }),
    );
    await reactions.save(
      new Reaction({ postId: post.id, userId: fan.id, type: 'like' }),
    );
    await prisma.bookmark.create({
      data: { id: newObjectId(), userId: fan.id, postId: post.id },
    });

    await posts.delete(post.id);

    const where = { postId: post.id };
    expect(await prisma.comment.count({ where })).toBe(0);
    expect(await prisma.reaction.count({ where })).toBe(0);
    expect(await prisma.bookmark.count({ where })).toBe(0);
    expect(await prisma.postTag.count({ where })).toBe(0);
    expect(await posts.findByIdRaw(repost.id)).toBeNull();
    // the tag itself survives
    expect(await prisma.tag.count({ where: { id: tag.id } })).toBe(1);
  });

  it('deleting a category keeps its posts (category set to null)', async () => {
    const posts = new PrismaPostRepository(prisma);
    const author = await createUser();
    const category = await prisma.category.create({
      data: {
        id: newObjectId(),
        name: 'c',
        slug: `${SEED_SLUG_PREFIX}d-${newObjectId()}`,
      },
    });
    const post = await posts.create(
      new Post({ authorId: author.id, content: 'x', categoryId: category.id }),
    );
    await prisma.category.delete({ where: { id: category.id } });
    expect((await posts.findByIdRaw(post.id))!.categoryId).toBeNull();
  });

  it('deleting a user removes their posts, comments, reactions and friendships', async () => {
    const posts = new PrismaPostRepository(prisma);
    const friendships = new PrismaFriendshipRepository(prisma);
    const author = await createUser();
    const other = await createUser();
    const post = await posts.create(
      new Post({ authorId: author.id, content: 'x' }),
    );
    await prisma.reaction.create({
      data: {
        id: newObjectId(),
        postId: post.id,
        userId: other.id,
        type: 'like',
      },
    });
    const edge = await friendships.create({
      userId: author.id,
      friendId: other.id,
      status: 'accepted',
    } as any);

    await prisma.user.delete({ where: { id: author.id } });
    expect(await posts.findByIdRaw(post.id)).toBeNull();
    expect(await prisma.reaction.count({ where: { postId: post.id } })).toBe(0);
    expect(await friendships.findById(edge.id)).toBeNull();
  });

  it('friendships: one edge per unordered pair and no self edges', async () => {
    const friendships = new PrismaFriendshipRepository(prisma);
    const a = await createUser();
    const b = await createUser();
    await friendships.create({
      userId: a.id,
      friendId: b.id,
      status: 'pending',
    } as any);
    await expect(
      friendships.create({
        userId: b.id,
        friendId: a.id,
        status: 'pending',
      } as any),
    ).rejects.toThrow('Friendship already exists');
    await expect(
      prisma.friendship.create({
        data: {
          id: newObjectId(),
          userId: a.id,
          friendId: a.id,
          status: 'pending',
        },
      }),
    ).rejects.toBeDefined();
  });

  it('posts must reference an existing author', async () => {
    const posts = new PrismaPostRepository(prisma);
    await expect(
      posts.create(new Post({ authorId: newObjectId(), content: 'orphan' })),
    ).rejects.toBeDefined();
  });

  it('a double repost surfaces as a conflict', async () => {
    const posts = new PrismaPostRepository(prisma);
    const author = await createUser();
    const fan = await createUser();
    const post = await posts.create(
      new Post({ authorId: author.id, content: 'x' }),
    );
    const repost = () =>
      posts.create(
        new Post({
          authorId: fan.id,
          type: 'REPOST',
          originalPostId: post.id,
          content: '',
        }),
      );
    await repost();
    await expect(repost()).rejects.toThrow('Already shared this post');
  });

  describe('PrismaUserRelations', () => {
    it('friendIdsOf lists every counterpart of any edge status; postCountsByAuthor counts all posts', async () => {
      const relations = new PrismaUserRelations(prisma);
      const posts = new PrismaPostRepository(prisma);
      const me = await createUser();
      const accepted = await createUser();
      const incoming = await createUser();
      const blocked = await createUser();
      const stranger = await createUser();
      const edge = (userId: string, friendId: string, status: any) =>
        prisma.friendship.create({
          data: { id: newObjectId(), userId, friendId, status },
        });
      await edge(me.id, accepted.id, 'accepted');
      await edge(incoming.id, me.id, 'pending');
      await edge(me.id, blocked.id, 'blocked');

      expect((await relations.friendIdsOf(me.id)).sort()).toEqual(
        [accepted.id, incoming.id, blocked.id].sort(),
      );
      expect(await relations.friendIdsOf(stranger.id)).toEqual([]);

      await posts.create(new Post({ authorId: me.id, content: 'a' }));
      await posts.create(
        new Post({ authorId: me.id, content: 'b', visibility: 'PRIVATE' }),
      );
      await posts.create(
        new Post({ authorId: accepted.id, content: 'c', isPublished: false }),
      );
      const counts = await relations.postCountsByAuthor([
        me.id,
        accepted.id,
        stranger.id,
      ]);
      expect(counts.get(me.id)).toBe(2);
      expect(counts.get(accepted.id)).toBe(1);
      expect(counts.has(stranger.id)).toBe(false);
      expect((await relations.postCountsByAuthor([])).size).toBe(0);
    });
  });
});
