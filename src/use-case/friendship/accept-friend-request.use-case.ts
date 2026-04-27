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
import { Friendship } from 'src/core/domain/entities/friendship.entity';

@Injectable()
export class AcceptFriendRequestUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY) private readonly repo: FriendshipRepository,
  ) {}

  async execute(friendshipId: string, currentUserId: string): Promise<Friendship> {
    const friendship = await this.repo.findById(friendshipId);
    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.friendId !== currentUserId) {
      throw new ForbiddenException('Only the recipient can accept');
    }
    if (friendship.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }
    return this.repo.updateStatus(friendship.id, 'accepted');
  }
}
