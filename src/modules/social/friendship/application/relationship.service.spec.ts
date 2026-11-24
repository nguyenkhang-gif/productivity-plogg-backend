import { Friendship } from 'src/modules/social/friendship/domain/friendship.entity';
import { RelationshipService } from './relationship.service';
import { UnfriendUseCase } from './unfriend.use-case';

const edge = (userId: string, friendId: string, status: any) =>
  new Friendship({ id: 'f', userId, friendId, status });

describe('RelationshipService', () => {
  const makeService = (opts: { pair?: Friendship | null; blocks?: any[] }) => {
    const repo = {
      findByPair: jest.fn().mockResolvedValue(opts.pair ?? null),
      findBlocksInvolving: jest.fn().mockResolvedValue(opts.blocks ?? []),
    };
    const cache = { delByPattern: jest.fn().mockResolvedValue(undefined) };
    return {
      repo,
      cache,
      service: new RelationshipService(repo as any, cache as any),
    };
  };

  describe('getRelationship', () => {
    it('returns self without hitting the repository', async () => {
      const { service, repo } = makeService({});
      expect(await service.getRelationship('a', 'a')).toEqual({
        isSelf: true,
        isFriend: false,
        blockedByViewer: false,
        blockedViewer: false,
      });
      expect(repo.findByPair).not.toHaveBeenCalled();
    });

    it('returns no relationship for strangers', async () => {
      const { service } = makeService({});
      expect(await service.getRelationship('a', 'b')).toEqual({
        isSelf: false,
        isFriend: false,
        blockedByViewer: false,
        blockedViewer: false,
      });
    });

    it('detects friends regardless of direction', async () => {
      const { service } = makeService({
        pair: edge('b', 'a', 'accepted'),
      });
      expect((await service.getRelationship('a', 'b')).isFriend).toBe(true);
    });

    it('distinguishes who placed the block', async () => {
      const { service } = makeService({ pair: edge('a', 'b', 'blocked') });
      expect(await service.getRelationship('a', 'b')).toMatchObject({
        blockedByViewer: true,
        blockedViewer: false,
      });
      expect(await service.getRelationship('b', 'a')).toMatchObject({
        blockedByViewer: false,
        blockedViewer: true,
      });
    });

    it('does not treat pending requests as friendship or block', async () => {
      const { service } = makeService({ pair: edge('a', 'b', 'pending') });
      expect(await service.getRelationship('a', 'b')).toMatchObject({
        isFriend: false,
        blockedByViewer: false,
        blockedViewer: false,
      });
    });
  });

  describe('getBlockedIds', () => {
    it('unions users blocked by the viewer and users who blocked the viewer', async () => {
      const { service, repo } = makeService({
        blocks: [
          edge('me', 'x', 'blocked'),
          edge('y', 'me', 'blocked'),
          edge('me', 'x', 'blocked'),
        ],
      });
      const ids = await service.getBlockedIds('me');
      expect(ids.sort()).toEqual(['x', 'y']);
      expect(repo.findBlocksInvolving).toHaveBeenCalledTimes(1);
      expect(repo.findBlocksInvolving).toHaveBeenCalledWith('me');
    });

    it('returns an empty list when nobody is blocked', async () => {
      const { service } = makeService({});
      expect(await service.getBlockedIds('me')).toEqual([]);
    });
  });

  describe('invalidateVisibilityCaches', () => {
    it('clears feed, single-post and author-page caches for both users', async () => {
      const { service, cache } = makeService({});
      await service.invalidateVisibilityCaches('a', 'b');
      const patterns = cache.delByPattern.mock.calls.map((c) => c[0]);
      expect(patterns).toEqual(
        expect.arrayContaining([
          'posts:all:a:*',
          'posts:all:b:*',
          'post:*:a',
          'post:*:b',
          'posts:author:a:b:*',
          'posts:author:b:a:*',
        ]),
      );
    });
  });
});

describe('UnfriendUseCase cache invalidation', () => {
  it('invalidates caches after removing a block', async () => {
    const repo = {
      findByPair: jest.fn().mockResolvedValue(edge('a', 'b', 'blocked')),
      delete: jest.fn(),
    };
    const relationships = {
      invalidateVisibilityCaches: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new UnfriendUseCase(repo as any, relationships as any);

    await useCase.execute('a', 'b');

    expect(repo.delete).toHaveBeenCalledWith('f');
    expect(relationships.invalidateVisibilityCaches).toHaveBeenCalledWith(
      'a',
      'b',
    );
  });
});
