import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  STORY_CONTEXT_REPOSITORY,
  StoryContextRepository,
} from 'src/core/domain/repositories/story-context.repository.interface';

@Injectable()
export class DeleteStoryContextUseCase {
  constructor(
    @Inject(STORY_CONTEXT_REPOSITORY)
    private readonly repo: StoryContextRepository,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('StoryContext not found');
    if (existing.userId !== userId) throw new ForbiddenException();
    return this.repo.delete(id);
  }
}
