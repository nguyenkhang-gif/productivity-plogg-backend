import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  REACTION_REPOSITORY,
  ReactionRepository,
} from 'src/core/domain/repositories/reaction.repository.interface';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { Reaction } from 'src/core/domain/entities/reaction.entity';

@Injectable()
export class ToggleReactionUseCase {
  constructor(
    @Inject(REACTION_REPOSITORY)
    private readonly reactionRepo: ReactionRepository,
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(
    postId: string,
    userId: string,
    type: string,
    icon?: string,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction: Reaction | null;
  }> {
    const post = await this.postRepo.findById(postId, userId);
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.reactionRepo.findByPostAndUser(postId, userId);

    if (existing && existing.type === type) {
      const deleted = await this.reactionRepo.deleteByPostAndUser(
        postId,
        userId,
      );
      if (deleted) await this.postRepo.incrementReactCount(postId, -1);
      return { action: 'removed', reaction: null };
    }

    const reaction = await this.reactionRepo.save(
      new Reaction({ postId, userId, type, icon }),
    );

    if (!existing) await this.postRepo.incrementReactCount(postId, +1);

    return { action: existing ? 'changed' : 'added', reaction };
  }
}
