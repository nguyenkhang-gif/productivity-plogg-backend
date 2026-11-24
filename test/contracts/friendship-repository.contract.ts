import { ConflictException } from '@nestjs/common';
import { newObjectId } from 'src/shared/database/object-id';
import { Friendship } from 'src/modules/social/friendship/domain/friendship.entity';
import type { FriendshipRepository } from 'src/modules/social/friendship/domain/friendship.repository.interface';
import { SendFriendRequestUseCase } from 'src/modules/social/friendship/application/send-friend-request.use-case';
import { AcceptFriendRequestUseCase } from 'src/modules/social/friendship/application/accept-friend-request.use-case';
import { RejectFriendRequestUseCase } from 'src/modules/social/friendship/application/reject-friend-request.use-case';
import { BlockUserUseCase } from 'src/modules/social/friendship/application/block-user.use-case';
import { UnfriendUseCase } from 'src/modules/social/friendship/application/unfriend.use-case';
import { RelationshipService } from 'src/modules/social/friendship/application/relationship.service';

export interface FriendshipRepositoryHarness {
  repo: FriendshipRepository;
  /** Creates a user the friendship rows may reference; returns its id. */
  user(): Promise<{
    id: string;
    fullName: string;
    username: string;
    profilePic?: string;
  }>;
  cleanup(): Promise<void>;
}

const cacheStub = { delByPattern: async () => undefined } as any;

/**
 * Repository semantics plus the friendship lifecycle driven through the real
 * use-cases (request / accept / reject / block / unfriend), so the rule "a
 * block can only be lifted by the user who placed it" is exercised against the
 * store's actual directionality handling.
 */
export function describeFriendshipRepositoryContract(
  name: string,
  factory: () => Promise<FriendshipRepositoryHarness>,
): void {
  describe(`FriendshipRepository contract: ${name}`, () => {
    let h: FriendshipRepositoryHarness;
    let repo: FriendshipRepository;

    beforeAll(async () => {
      h = await factory();
      repo = h.repo;
    });

    afterAll(async () => {
      await h.cleanup();
    });

    const edge = (userId: string, friendId: string, status: any = 'pending') =>
      new Friendship({ userId, friendId, status });

    describe('create / lookups', () => {
      it('persists a directed edge and finds it by id and by pair (either order)', async () => {
        const a = await h.user();
        const b = await h.user();
        const created = await repo.create(edge(a.id, b.id));
        expect(created.id).toMatch(/^[0-9a-f]{24}$/);
        expect(created).toMatchObject({
          userId: a.id,
          friendId: b.id,
          status: 'pending',
        });
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);

        expect((await repo.findById(created.id))?.id).toBe(created.id);
        expect(await repo.findById(newObjectId())).toBeNull();

        const forward = await repo.findByPair(a.id, b.id);
        const reverse = await repo.findByPair(b.id, a.id);
        expect(forward?.id).toBe(created.id);
        expect(reverse?.id).toBe(created.id);
        // the direction of the original edge is preserved
        expect(reverse).toMatchObject({ userId: a.id, friendId: b.id });
        expect(await repo.findByPair(a.id, (await h.user()).id)).toBeNull();
      });

      it('rejects a duplicate edge for the same direction', async () => {
        const a = await h.user();
        const b = await h.user();
        await repo.create(edge(a.id, b.id));
        await expect(repo.create(edge(a.id, b.id))).rejects.toBeDefined();
      });

      it('updateStatus changes the status; unknown ids throw', async () => {
        const a = await h.user();
        const b = await h.user();
        const created = await repo.create(edge(a.id, b.id));
        const updated = await repo.updateStatus(created.id, 'accepted');
        expect(updated).toMatchObject({
          id: created.id,
          userId: a.id,
          friendId: b.id,
          status: 'accepted',
        });
        await expect(
          repo.updateStatus(newObjectId(), 'accepted'),
        ).rejects.toThrow('Friendship not found');
      });

      it('delete removes the edge and tolerates unknown ids', async () => {
        const a = await h.user();
        const b = await h.user();
        const created = await repo.create(edge(a.id, b.id));
        await repo.delete(created.id);
        expect(await repo.findById(created.id)).toBeNull();
        await expect(repo.delete(created.id)).resolves.toBeUndefined();
      });
    });

    describe('listings', () => {
      it('findFriends returns accepted edges in both directions with the other user as friendInfo', async () => {
        const me = await h.user();
        const sent = await h.user();
        const received = await h.user();
        const pending = await h.user();
        const blocked = await h.user();
        const stranger = await h.user();
        const strangersFriend = await h.user();

        await repo.create(edge(me.id, sent.id, 'accepted'));
        await repo.create(edge(received.id, me.id, 'accepted'));
        await repo.create(edge(me.id, pending.id, 'pending'));
        await repo.create(edge(me.id, blocked.id, 'blocked'));
        await repo.create(edge(stranger.id, strangersFriend.id, 'accepted'));

        const friends = await repo.findFriends(me.id);
        expect(friends.map((f) => f.friendInfo!.id).sort()).toEqual(
          [sent.id, received.id].sort(),
        );
        const sentEdge = friends.find((f) => f.friendInfo!.id === sent.id)!;
        expect(sentEdge).toMatchObject({ userId: me.id, friendId: sent.id });
        expect(sentEdge.friendInfo).toMatchObject({
          fullName: sent.fullName,
          username: sent.username,
        });
        const receivedEdge = friends.find(
          (f) => f.friendInfo!.id === received.id,
        )!;
        expect(receivedEdge).toMatchObject({
          userId: received.id,
          friendId: me.id,
        });
        expect(await repo.findFriends(newObjectId())).toEqual([]);
      });

      it('pending lists carry the counterpart as friendInfo', async () => {
        const me = await h.user();
        const sender = await h.user();
        const target = await h.user();
        const accepted = await h.user();
        await repo.create(edge(sender.id, me.id, 'pending'));
        await repo.create(edge(me.id, target.id, 'pending'));
        await repo.create(edge(accepted.id, me.id, 'accepted'));

        const received = await repo.findPendingReceived(me.id);
        expect(received).toHaveLength(1);
        expect(received[0]).toMatchObject({
          userId: sender.id,
          friendId: me.id,
          status: 'pending',
        });
        expect(received[0].friendInfo).toMatchObject({
          id: sender.id,
          username: sender.username,
        });

        const sent = await repo.findPendingSent(me.id);
        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ userId: me.id, friendId: target.id });
        expect(sent[0].friendInfo).toMatchObject({ id: target.id });
      });

      it('findBlocksInvolving returns blocks in both directions only', async () => {
        const me = await h.user();
        const iBlocked = await h.user();
        const blockedMe = await h.user();
        const friend = await h.user();
        await repo.create(edge(me.id, iBlocked.id, 'blocked'));
        await repo.create(edge(blockedMe.id, me.id, 'blocked'));
        await repo.create(edge(me.id, friend.id, 'accepted'));

        const blocks = await repo.findBlocksInvolving(me.id);
        expect(
          blocks.map((b) => [b.userId, b.friendId, b.status]).sort(),
        ).toEqual(
          [
            [me.id, iBlocked.id, 'blocked'],
            [blockedMe.id, me.id, 'blocked'],
          ].sort(),
        );
      });
    });

    describe('lifecycle through the use-cases', () => {
      const wire = () => {
        const relationships = new RelationshipService(repo, cacheStub);
        return {
          relationships,
          send: new SendFriendRequestUseCase(repo),
          accept: new AcceptFriendRequestUseCase(repo),
          reject: new RejectFriendRequestUseCase(repo),
          block: new BlockUserUseCase(repo, relationships),
          unfriend: new UnfriendUseCase(repo, relationships),
        };
      };

      it('request -> accept -> unfriend', async () => {
        const uc = wire();
        const a = await h.user();
        const b = await h.user();

        const req = await uc.send.execute(a.id, b.id);
        expect(req).toMatchObject({
          userId: a.id,
          friendId: b.id,
          status: 'pending',
        });
        await expect(uc.send.execute(a.id, b.id)).rejects.toThrow(
          'Friend request already sent',
        );
        await expect(uc.send.execute(b.id, a.id)).rejects.toThrow(
          'Friend request already sent',
        );
        // only the recipient can accept
        await expect(uc.accept.execute(req.id, a.id)).rejects.toThrow(
          'Only the recipient can accept',
        );

        const accepted = await uc.accept.execute(req.id, b.id);
        expect(accepted.status).toBe('accepted');
        expect(
          await uc.relationships.getRelationship(a.id, b.id),
        ).toMatchObject({
          isFriend: true,
          blockedByViewer: false,
          blockedViewer: false,
        });
        expect(
          await uc.relationships.getRelationship(b.id, a.id),
        ).toMatchObject({
          isFriend: true,
        });
        await expect(uc.send.execute(b.id, a.id)).rejects.toBeInstanceOf(
          ConflictException,
        );
        await expect(uc.accept.execute(req.id, b.id)).rejects.toThrow(
          'Request is not pending',
        );

        await uc.unfriend.execute(b.id, a.id);
        expect(await repo.findByPair(a.id, b.id)).toBeNull();
        await expect(uc.unfriend.execute(a.id, b.id)).rejects.toThrow(
          'Friendship not found',
        );
      });

      it('request -> reject removes the edge so it can be re-sent', async () => {
        const uc = wire();
        const a = await h.user();
        const b = await h.user();
        const req = await uc.send.execute(a.id, b.id);
        await expect(uc.reject.execute(req.id, a.id)).rejects.toThrow(
          'Only the recipient can reject',
        );
        await uc.reject.execute(req.id, b.id);
        expect(await repo.findByPair(a.id, b.id)).toBeNull();
        const again = await uc.send.execute(b.id, a.id);
        expect(again).toMatchObject({ userId: b.id, friendId: a.id });
      });

      it('blocking records who blocked; the blocked party cannot undo it', async () => {
        const uc = wire();
        const a = await h.user();
        const b = await h.user();

        const blocked = await uc.block.execute(a.id, b.id);
        expect(blocked).toMatchObject({
          userId: a.id,
          friendId: b.id,
          status: 'blocked',
        });
        expect(
          await uc.relationships.getRelationship(a.id, b.id),
        ).toMatchObject({
          blockedByViewer: true,
          blockedViewer: false,
        });
        expect(
          await uc.relationships.getRelationship(b.id, a.id),
        ).toMatchObject({
          blockedByViewer: false,
          blockedViewer: true,
        });
        expect(await uc.relationships.getBlockedIds(a.id)).toContain(b.id);
        expect(await uc.relationships.getBlockedIds(b.id)).toContain(a.id);

        await expect(uc.block.execute(b.id, a.id)).rejects.toThrow(
          'Unable to block this user',
        );
        await expect(uc.block.execute(a.id, b.id)).rejects.toThrow(
          'User is already blocked',
        );
        await expect(uc.unfriend.execute(b.id, a.id)).rejects.toThrow(
          'Cannot remove a block placed by another user',
        );
        await expect(uc.send.execute(b.id, a.id)).rejects.toThrow(
          'Cannot send request',
        );
        // edge is untouched by all of the above
        expect(await repo.findByPair(a.id, b.id)).toMatchObject({
          userId: a.id,
          status: 'blocked',
        });

        await uc.unfriend.execute(a.id, b.id);
        expect(await repo.findByPair(a.id, b.id)).toBeNull();
        expect(await uc.relationships.getBlockedIds(a.id)).not.toContain(b.id);
      });

      it('blocking a user who sent a request flips the direction to the blocker', async () => {
        const uc = wire();
        const a = await h.user();
        const b = await h.user();
        await uc.send.execute(a.id, b.id); // a -> b pending
        const blocked = await uc.block.execute(b.id, a.id);
        expect(blocked).toMatchObject({
          userId: b.id,
          friendId: a.id,
          status: 'blocked',
        });
        expect(await repo.findByPair(a.id, b.id)).toMatchObject({
          userId: b.id,
          status: 'blocked',
        });
        // a is now the blocked party
        await expect(uc.block.execute(a.id, b.id)).rejects.toThrow(
          'Unable to block this user',
        );
      });

      it('blocking a friend turns the accepted edge into a block placed by the blocker', async () => {
        const uc = wire();
        const a = await h.user();
        const b = await h.user();
        const req = await uc.send.execute(a.id, b.id);
        await uc.accept.execute(req.id, b.id);

        // a (the original requester) blocks: same edge, status flips in place
        const blocked = await uc.block.execute(a.id, b.id);
        expect(blocked).toMatchObject({
          id: req.id,
          userId: a.id,
          status: 'blocked',
        });
        expect(await repo.findFriends(a.id)).toEqual(
          expect.not.arrayContaining([
            expect.objectContaining({
              friendInfo: expect.objectContaining({ id: b.id }),
            }),
          ]),
        );
      });

      it('cannot befriend or block yourself', async () => {
        const uc = wire();
        const a = await h.user();
        await expect(uc.send.execute(a.id, a.id)).rejects.toThrow(
          'Cannot send friend request to yourself',
        );
        await expect(uc.block.execute(a.id, a.id)).rejects.toThrow(
          'Cannot block yourself',
        );
      });
    });
  });
}
