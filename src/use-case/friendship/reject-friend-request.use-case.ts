import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FRIENDSHIP_REPOSITORY,
  FriendshipRepository,
} from 'src/core/domain/repositories/friendship.repository.interface';

@Injectable()
export class RejectFriendRequestUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY) private readonly repo: FriendshipRepository,
  ) {}

  async execute(friendshipId: string, currentUserId: string): Promise<void> {
    const friendship = await this.repo.findById(friendshipId);
    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.friendId !== currentUserId) {
      throw new ForbiddenException('Only the recipient can reject');
    }
    if (friendship.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }
    await this.repo.delete(friendship.id);
  }
}
