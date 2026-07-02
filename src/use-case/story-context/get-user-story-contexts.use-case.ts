import { Inject, Injectable } from '@nestjs/common';
import {
  STORY_CONTEXT_REPOSITORY,
  PaginatedStoryContexts,
  StoryContextRepository,
} from 'src/core/domain/repositories/story-context.repository.interface';

@Injectable()
export class GetUserStoryContextsUseCase {
  constructor(
    @Inject(STORY_CONTEXT_REPOSITORY)
    private readonly repo: StoryContextRepository,
  ) {}

  async execute(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedStoryContexts> {
    return this.repo.findByUserId(userId, page, limit);
  }
}
