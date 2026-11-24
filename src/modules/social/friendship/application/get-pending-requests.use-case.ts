import { Inject, Injectable } from '@nestjs/common';
import {
  FRIENDSHIP_REPOSITORY,
  FriendshipRepository,
} from 'src/modules/social/friendship/domain/friendship.repository.interface';
import { Friendship } from 'src/modules/social/friendship/domain/friendship.entity';

@Injectable()
export class GetPendingRequestsUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPOSITORY) private readonly repo: FriendshipRepository,
  ) {}

  async executeReceived(userId: string): Promise<Friendship[]> {
    return this.repo.findPendingReceived(userId);
  }

  async executeSent(userId: string): Promise<Friendship[]> {
    return this.repo.findPendingSent(userId);
  }
}
