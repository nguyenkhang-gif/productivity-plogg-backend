import { Inject, Injectable } from '@nestjs/common';
import {
  STORY_CONTEXT_REPOSITORY,
  StoryContextRepository,
} from 'src/modules/labs/story-context/domain/story-context.repository.interface';
import { StoryContext } from 'src/modules/labs/story-context/domain/story-context.entity';
import { CreateStoryContextDto } from 'src/modules/labs/story-context/application/dto/story-context.dto';

@Injectable()
export class CreateStoryContextUseCase {
  constructor(
    @Inject(STORY_CONTEXT_REPOSITORY)
    private readonly repo: StoryContextRepository,
  ) {}

  async execute(
    userId: string,
    dto: CreateStoryContextDto,
  ): Promise<StoryContext> {
    const context = new StoryContext({
      userId,
      title: dto.title,
      author: dto.author,
      genre: dto.genre,
      setting: dto.setting,
      targetTone: dto.targetTone,
      sourceLanguage: dto.sourceLanguage ?? 'en',
      targetLanguage: dto.targetLanguage ?? 'vi',
      characters: dto.characters ?? [],
      glossary: dto.glossary ?? [],
      styleGuide: dto.styleGuide,
      chapterSummaries: dto.chapterSummaries ?? [],
    });
    return this.repo.create(context);
  }
}
