import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  STORY_CONTEXT_REPOSITORY,
  StoryContextRepository,
} from 'src/modules/labs/story-context/domain/story-context.repository.interface';
import { StoryContext } from 'src/modules/labs/story-context/domain/story-context.entity';

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
