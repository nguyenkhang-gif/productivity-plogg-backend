import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  FRIENDSHIP_REPOSITORY,
  FriendshipRepository,
} from 'src/core/domain/repositories/friendship.repository.interface';
import { Friendship } from 'src/core/domain/entities/friendship.entity';

@Injectable()
export class BlockUserUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY) private readonly repo: FriendshipRepository,
  ) {}

  async execute(userId: string, targetId: string): Promise<Friendship> {
    if (userId === targetId) throw new BadRequestException('Cannot block yourself');

    const existing = await this.repo.findByPair(userId, targetId);

    if (existing) {
      if (existing.status === 'blocked' && existing.userId === userId) {
        throw new BadRequestException('User is already blocked');
      }
      // Reuse the existing record: update to blocked, set userId = blocker
      if (existing.userId !== userId) {
        // The other person sent the request — delete and recreate with correct direction
        await this.repo.delete(existing.id);
        return this.repo.create(new Friendship({ userId, friendId: targetId, status: 'blocked' }));
      }
      return this.repo.updateStatus(existing.id, 'blocked');
    }

    return this.repo.create(new Friendship({ userId, friendId: targetId, status: 'blocked' }));
  }
}
