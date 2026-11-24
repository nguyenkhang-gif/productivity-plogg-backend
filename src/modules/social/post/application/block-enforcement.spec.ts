import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NO_RELATIONSHIP } from 'src/modules/social/friendship/domain/relationship';
import { Post } from 'src/modules/social/post/domain/post.entity';
import { GetPostUseCase } from './get-post.use-case';
import { GetPostsByAuthorUseCase } from './get-posts-by-author.use-case';
import { GetPostsUseCase } from './get-posts.use-case';
import { GetTrendingPostsUseCase } from './get-trending-posts.use-case';
import { UpdatePostUseCase } from './update-post.use-case';
import { DeletePostUseCase } from './delete-post.use-case';
import { CreateCommentUseCase } from 'src/modules/social/comment/application/create-comment.use-case';
import { GetCommentsByPostUseCase } from 'src/modules/social/comment/application/get-comments-by-post.use-case';
import { UpdateCommentUseCase } from 'src/modules/social/comment/application/update-comment.use-case';
import { DeleteCommentUseCase } from 'src/modules/social/comment/application/delete-comment.use-case';
import { ToggleReactionUseCase } from 'src/modules/social/reaction/application/toggle-reaction.use-case';
import { SharePostUseCase } from 'src/modules/social/share/application/share-post.use-case';
import { AddBookmarkUseCase } from 'src/modules/social/bookmark/application/add-bookmark.use-case';

const OBJ_ID = '507f1f77bcf86cd799439011';

const makePost = (overrides: Partial<Post> = {}) =>
  new Post({
    id: OBJ_ID,
    authorId: 'author',
    type: 'ORIGINAL',
    visibility: 'PUBLIC',
    moderationStatus: 'APPROVED',
    isPublished: true,
    content: 'x',
    ...overrides,
  });

const blockedRelationship = {
  ...NO_RELATIONSHIP,
  blockedViewer: true,
};

const makeCache = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn(),
  delByPattern: jest.fn(),
});

const makeRelationships = (
  blocked: string[] = [],
  relationship: any = NO_RELATIONSHIP,
) => ({
  getBlockedIds: jest.fn().mockResolvedValue(blocked),
  getRelationship: jest.fn().mockResolvedValue(relationship),
});

describe('block enforcement', () => {
  describe('GetPostUseCase', () => {
    it('passes the blocked set to the repository and returns 404 when hidden', async () => {
      const postRepo = { findById: jest.fn().mockResolvedValue(null) };
      const relationships = makeRelationships(['author']);
      const useCase = new GetPostUseCase(
        postRepo as any,
        makeCache() as any,
        relationships as any,
      );

      await expect(useCase.execute(OBJ_ID, 'viewer')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(postRepo.findById).toHaveBeenCalledWith(OBJ_ID, 'viewer', {
        blockedAuthorIds: ['author'],
      });
    });

    it('computes the blocked set only on cache miss', async () => {
      const cache = makeCache();
      cache.get.mockResolvedValue({ id: OBJ_ID });
      const relationships = makeRelationships();
      const useCase = new GetPostUseCase(
        { findById: jest.fn() } as any,
        cache as any,
        relationships as any,
      );

      await useCase.execute(OBJ_ID, 'viewer');
      expect(relationships.getBlockedIds).not.toHaveBeenCalled();
    });

    it('returns the post when nobody is blocked', async () => {
      const post = makePost();
      const postRepo = { findById: jest.fn().mockResolvedValue(post) };
      const useCase = new GetPostUseCase(
        postRepo as any,
        makeCache() as any,
        makeRelationships() as any,
      );
      await expect(useCase.execute(OBJ_ID, 'viewer')).resolves.toBe(post);
    });
  });

  describe('GetPostsByAuthorUseCase', () => {
    it('returns an empty page without querying posts when blocked', async () => {
      const postRepo = { findByAuthor: jest.fn() };
      const useCase = new GetPostsByAuthorUseCase(
        postRepo as any,
        makeCache() as any,
        makeRelationships([], blockedRelationship) as any,
      );

      const result = await useCase.execute('author', 2, 10, 'viewer');

      expect(result).toEqual({
        items: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
      });
      expect(postRepo.findByAuthor).not.toHaveBeenCalled();
    });

    it('also hides the page when the viewer is the one who blocked', async () => {
      const postRepo = { findByAuthor: jest.fn() };
      const useCase = new GetPostsByAuthorUseCase(
        postRepo as any,
        makeCache() as any,
        makeRelationships([], {
          ...NO_RELATIONSHIP,
          blockedByViewer: true,
        }) as any,
      );
      const result = await useCase.execute('author', 1, 10, 'viewer');
      expect(result.items).toEqual([]);
      expect(postRepo.findByAuthor).not.toHaveBeenCalled();
    });

    it('delegates to the repository otherwise', async () => {
      const page = {
        items: [makePost()],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      const postRepo = { findByAuthor: jest.fn().mockResolvedValue(page) };
      const useCase = new GetPostsByAuthorUseCase(
        postRepo as any,
        makeCache() as any,
        makeRelationships() as any,
      );
      await expect(useCase.execute('author', 1, 10, 'viewer')).resolves.toBe(
        page,
      );
    });
  });

  describe('feeds', () => {
    it('GetPostsUseCase excludes blocked authors through the filter', async () => {
      const postRepo = {
        findAll: jest.fn().mockResolvedValue({ items: [], pagination: {} }),
      };
      const useCase = new GetPostsUseCase(
        postRepo as any,
        makeCache() as any,
        makeRelationships(['x', 'y']) as any,
      );

      await useCase.execute(1, 10, 'viewer', { categoryId: 'c' });

      expect(postRepo.findAll).toHaveBeenCalledWith(1, 10, 'viewer', {
        categoryId: 'c',
        blockedAuthorIds: ['x', 'y'],
      });
    });

    it('GetTrendingPostsUseCase excludes blocked authors', async () => {
      const postRepo = { findTrending: jest.fn().mockResolvedValue([]) };
      const useCase = new GetTrendingPostsUseCase(
        postRepo as any,
        makeRelationships(['x']) as any,
      );
      await useCase.execute(5, 'viewer');
      expect(postRepo.findTrending).toHaveBeenCalledWith(5, 'viewer', ['x']);
    });
  });

  describe('AddBookmarkUseCase', () => {
    it('404s when the author is blocked', async () => {
      const bookmarkRepo = { upsert: jest.fn() };
      const postRepo = { findById: jest.fn().mockResolvedValue(null) };
      const useCase = new AddBookmarkUseCase(
        bookmarkRepo as any,
        postRepo as any,
        makeRelationships(['author']) as any,
      );
      await expect(useCase.execute('viewer', OBJ_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(bookmarkRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('CreateCommentUseCase', () => {
    const input = { postId: OBJ_ID, authorId: 'viewer', content: 'hi' };

    it('403s when the post author is blocked either way', async () => {
      const commentRepo = { create: jest.fn() };
      const postRepo = { findById: jest.fn().mockResolvedValue(makePost()) };
      const useCase = new CreateCommentUseCase(
        commentRepo as any,
        postRepo as any,
        makeRelationships([], blockedRelationship) as any,
      );

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(commentRepo.create).not.toHaveBeenCalled();
    });

    it('creates the comment for non-blocked users', async () => {
      const commentRepo = { create: jest.fn(async (c) => c) };
      const postRepo = { findById: jest.fn().mockResolvedValue(makePost()) };
      const useCase = new CreateCommentUseCase(
        commentRepo as any,
        postRepo as any,
        makeRelationships() as any,
      );

      await useCase.execute(input);
      expect(commentRepo.create).toHaveBeenCalled();
    });

    it('still 404s when the post is missing', async () => {
      const useCase = new CreateCommentUseCase(
        { create: jest.fn() } as any,
        { findById: jest.fn().mockResolvedValue(null) } as any,
        makeRelationships() as any,
      );
      await expect(useCase.execute(input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('GetCommentsByPostUseCase', () => {
    it('hides comments from blocked authors and 404s for blocked post authors', async () => {
      const commentRepo = {
        findByPost: jest.fn().mockResolvedValue({ items: [], pagination: {} }),
      };
      const postRepo = { findById: jest.fn().mockResolvedValue(makePost()) };
      const useCase = new GetCommentsByPostUseCase(
        commentRepo as any,
        postRepo as any,
        makeRelationships(['x']) as any,
      );

      await useCase.execute(OBJ_ID, 'viewer', 1, 20);
      expect(commentRepo.findByPost).toHaveBeenCalledWith(OBJ_ID, 1, 20, ['x']);
      expect(postRepo.findById).toHaveBeenCalledWith(OBJ_ID, 'viewer', {
        blockedAuthorIds: ['x'],
      });

      postRepo.findById.mockResolvedValue(null);
      await expect(
        useCase.execute(OBJ_ID, 'viewer', 1, 20),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('ToggleReactionUseCase', () => {
    const makeReactionRepo = (existing: any = null) => ({
      findByPostAndUser: jest.fn().mockResolvedValue(existing),
      save: jest.fn(async (r) => r),
      deleteByPostAndUser: jest.fn(),
    });

    it('403s when reacting to a blocked author post', async () => {
      const reactionRepo = makeReactionRepo();
      const useCase = new ToggleReactionUseCase(
        reactionRepo as any,
        { findById: jest.fn().mockResolvedValue(makePost()) } as any,
        makeRelationships([], blockedRelationship) as any,
      );

      await expect(
        useCase.execute(OBJ_ID, 'viewer', 'like'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(reactionRepo.save).not.toHaveBeenCalled();
    });

    it('still lets a user retract an existing reaction after a block', async () => {
      const reactionRepo = makeReactionRepo({ type: 'like' });
      const useCase = new ToggleReactionUseCase(
        reactionRepo as any,
        { findById: jest.fn().mockResolvedValue(makePost()) } as any,
        makeRelationships([], blockedRelationship) as any,
      );

      const result = await useCase.execute(OBJ_ID, 'viewer', 'like');
      expect(result.action).toBe('removed');
    });

    it('adds a reaction for non-blocked users', async () => {
      const reactionRepo = makeReactionRepo();
      const useCase = new ToggleReactionUseCase(
        reactionRepo as any,
        { findById: jest.fn().mockResolvedValue(makePost()) } as any,
        makeRelationships() as any,
      );
      const result = await useCase.execute(OBJ_ID, 'viewer', 'like');
      expect(result.action).toBe('added');
    });
  });

  describe('SharePostUseCase', () => {
    it('403s when sharing a blocked author post', async () => {
      const postRepo = {
        findById: jest.fn().mockResolvedValue(makePost()),
        create: jest.fn(),
      };
      const useCase = new SharePostUseCase(
        postRepo as any,
        makeRelationships([], blockedRelationship) as any,
      );
      await expect(
        useCase.execute(OBJ_ID, 'viewer', 'caption'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(postRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('author-only policies', () => {
    const cache = makeCache();
    const noop: any = {};

    it('UpdatePostUseCase keeps rejecting non-authors with 403', async () => {
      const useCase = new UpdatePostUseCase(
        { findById: jest.fn().mockResolvedValue(makePost()) } as any,
        noop,
        noop,
        cache as any,
      );
      await expect(
        useCase.execute(OBJ_ID, 'other', { title: 't' }),
      ).rejects.toThrow('Not your post');
    });

    it('DeletePostUseCase keeps rejecting non-authors with 403', async () => {
      const postRepo = {
        findById: jest.fn().mockResolvedValue(makePost()),
        delete: jest.fn(),
      };
      const useCase = new DeletePostUseCase(
        postRepo as any,
        noop,
        noop,
        cache as any,
      );
      await expect(useCase.execute(OBJ_ID, 'other')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(postRepo.delete).not.toHaveBeenCalled();
    });

    it('comment update/delete keep rejecting non-authors with 403', async () => {
      const commentRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'c', authorId: 'c1' }),
        update: jest.fn(),
        delete: jest.fn(),
      };
      await expect(
        new UpdateCommentUseCase(commentRepo as any).execute('c', 'other', 'x'),
      ).rejects.toThrow('Not your comment');
      await expect(
        new DeleteCommentUseCase(commentRepo as any).execute('c', 'other'),
      ).rejects.toThrow('Not your comment');
      expect(commentRepo.update).not.toHaveBeenCalled();
      expect(commentRepo.delete).not.toHaveBeenCalled();
    });
  });
});
