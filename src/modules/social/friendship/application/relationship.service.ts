import { Inject, Injectable } from '@nestjs/common';
import {
  FRIENDSHIP_REPOSITORY,
  FriendshipRepository,
} from 'src/modules/social/friendship/domain/friendship.repository.interface';
import {
  Relationship,
  SELF_RELATIONSHIP,
  blockedIdsFromEdges,
  relationshipFromEdge,
} from 'src/modules/social/friendship/domain/relationship';
import { CacheService } from 'src/shared/cache/cache.service';

@Injectable()
export class RelationshipService {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendshipRepo: FriendshipRepository,
    private readonly cache: CacheService,
  ) {}

  async getRelationship(
    viewerId: string,
    otherId: string,
  ): Promise<Relationship> {
    if (viewerId === otherId) return SELF_RELATIONSHIP;
    const edge = await this.friendshipRepo.findByPair(viewerId, otherId);
    return relationshipFromEdge(viewerId, otherId, edge);
  }

  async getBlockedIds(viewerId: string): Promise<string[]> {
    const edges = await this.friendshipRepo.findBlocksInvolving(viewerId);
    return blockedIdsFromEdges(viewerId, edges);
  }

  async invalidateVisibilityCaches(
    userId: string,
    otherId: string,
  ): Promise<void> {
    await Promise.all(
      [userId, otherId].flatMap((id) => [
        this.cache.delByPattern(`posts:all:${id}:*`),
        this.cache.delByPattern(`post:*:${id}`),
      ]),
    );
    await Promise.all([
      this.cache.delByPattern(`posts:author:${userId}:${otherId}:*`),
      this.cache.delByPattern(`posts:author:${otherId}:${userId}:*`),
    ]);
  }
}
