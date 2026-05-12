import { Inject, Injectable } from '@nestjs/common';
import {
  REACTION_REPOSITORY,
  ReactionRepository,
} from 'src/core/domain/repositories/reaction.repository.interface';

@Injectable()
export class RemoveReactionUseCase {
  constructor(
    @Inject(REACTION_REPOSITORY) private readonly reactionRepo: ReactionRepository,
  ) {}

  async execute(postId: string, userId: string): Promise<void> {
    await this.reactionRepo.deleteByPostAndUser(postId, userId);
  }
}
