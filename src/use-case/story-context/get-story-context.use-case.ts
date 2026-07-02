import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  STORY_CONTEXT_REPOSITORY,
  StoryContextRepository,
} from 'src/core/domain/repositories/story-context.repository.interface';
import { StoryContext } from 'src/core/domain/entities/story-context.entity';

@Injectable()
export class GetStoryContextUseCase {
  constructor(
    @Inject(STORY_CONTEXT_REPOSITORY)
    private readonly repo: StoryContextRepository,
  ) {}

  async execute(id: string, userId: string): Promise<StoryContext> {
    const context = await this.repo.findById(id);
    if (!context) throw new NotFoundException('StoryContext not found');
    if (context.userId !== userId) throw new ForbiddenException();
    return context;
  }
}
