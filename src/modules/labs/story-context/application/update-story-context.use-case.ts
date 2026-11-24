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
import { UpdateStoryContextDto } from 'src/modules/labs/story-context/application/dto/story-context.dto';

@Injectable()
export class UpdateStoryContextUseCase {
  constructor(
    @Inject(STORY_CONTEXT_REPOSITORY)
    private readonly repo: StoryContextRepository,
  ) {}

  async execute(
    id: string,
    userId: string,
    dto: UpdateStoryContextDto,
  ): Promise<StoryContext> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('StoryContext not found');
    if (existing.userId !== userId) throw new ForbiddenException();
    return this.repo.update(id, dto);
  }
}
