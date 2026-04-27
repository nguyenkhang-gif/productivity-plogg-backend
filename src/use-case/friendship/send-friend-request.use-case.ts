import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  FRIENDSHIP_REPOSITORY,
  FriendshipRepository,
} from 'src/core/domain/repositories/friendship.repository.interface';
import { Friendship } from 'src/core/domain/entities/friendship.entity';

@Injectable()
export class SendFriendRequestUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY) private readonly repo: FriendshipRepository,
  ) {}

  async execute(userId: string, friendId: string): Promise<Friendship> {
    if (userId === friendId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const existing = await this.repo.findByPair(userId, friendId);

    if (existing) {
      if (existing.status === 'accepted') throw new ConflictException('Already friends');
      if (existing.status === 'pending') throw new ConflictException('Friend request already sent');
      if (existing.status === 'blocked') throw new BadRequestException('Cannot send request');
    }

    return this.repo.create(new Friendship({ userId, friendId, status: 'pending' }));
  }
}
