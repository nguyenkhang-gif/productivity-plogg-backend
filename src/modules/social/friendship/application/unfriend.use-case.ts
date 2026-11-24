import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FRIENDSHIP_REPOSITORY,
  FriendshipRepository,
} from 'src/modules/social/friendship/domain/friendship.repository.interface';
import { RelationshipService } from 'src/modules/social/friendship/application/relationship.service';

@Injectable()
export class UnfriendUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY) private readonly repo: FriendshipRepository,
    private readonly relationships: RelationshipService,
  ) {}

  async execute(userId: string, friendId: string): Promise<void> {
    const friendship = await this.repo.findByPair(userId, friendId);
    if (!friendship) throw new NotFoundException('Friendship not found');
    if (friendship.status === 'blocked' && friendship.userId !== userId) {
      throw new ForbiddenException(
        'Cannot remove a block placed by another user',
      );
    }
    await this.repo.delete(friendship.id);
    await this.relationships.invalidateVisibilityCaches(userId, friendId);
  }
}
