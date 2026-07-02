import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StoryContext,
  StoryContextSchema,
} from 'src/infrastructure/databases/schemas/story-context.schema';
import { MongoStoryContextRepository } from 'src/infrastructure/databases/repositories/story-context.repository';
import { STORY_CONTEXT_REPOSITORY } from 'src/core/domain/repositories/story-context.repository.interface';
import { StoryContextController } from 'src/presentation/controllers/story-context.controller';
import { CreateStoryContextUseCase } from 'src/use-case/story-context/create-story-context.use-case';
import { GetStoryContextUseCase } from 'src/use-case/story-context/get-story-context.use-case';
import { GetUserStoryContextsUseCase } from 'src/use-case/story-context/get-user-story-contexts.use-case';
import { UpdateStoryContextUseCase } from 'src/use-case/story-context/update-story-context.use-case';
import { DeleteStoryContextUseCase } from 'src/use-case/story-context/delete-story-context.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoryContext.name, schema: StoryContextSchema },
    ]),
  ],
  controllers: [StoryContextController],
  providers: [
    {
      provide: STORY_CONTEXT_REPOSITORY,
      useClass: MongoStoryContextRepository,
    },
    CreateStoryContextUseCase,
    GetStoryContextUseCase,
    GetUserStoryContextsUseCase,
    UpdateStoryContextUseCase,
    DeleteStoryContextUseCase,
  ],
})
export class StoryContextModule {}
