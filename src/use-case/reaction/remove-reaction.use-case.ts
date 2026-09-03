import { Inject, Injectable } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import {
  REACTION_REPOSITORY,
  ReactionRepository,
} from 'src/core/domain/repositories/reaction.repository.interface';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class RemoveReactionUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepo: PostRepository,
    @Inject(REACTION_REPOSITORY)
    private readonly reactionRepo: ReactionRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(postId: string, userId: string): Promise<void> {
    const deleted = await this.reactionRepo.deleteByPostAndUser(postId, userId);
    if (!deleted) return;

    await this.postRepo.incrementReactCount(postId, -1);
    // chỉ `post:{id}:*` — xem ghi chú ở ToggleReactionUseCase
    await this.cache.delByPattern(`post:${postId}:*`);
  }
}
