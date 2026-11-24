import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StoryContext,
  StoryContextSchema,
} from 'src/modules/labs/story-context/infrastructure/story-context.schema';
import { MongoStoryContextRepository } from 'src/modules/labs/story-context/infrastructure/story-context.repository';
import { PrismaStoryContextRepository } from 'src/modules/labs/story-context/infrastructure/story-context.prisma.repository';
import {
  STORY_CONTEXT_REPOSITORY,
  type StoryContextRepository,
} from 'src/modules/labs/story-context/domain/story-context.repository.interface';
import { PrismaModule } from 'src/shared/database/prisma.module';
import { backendProvider } from 'src/shared/database/backend-provider';
import { StoryContextController } from 'src/modules/labs/story-context/presentation/story-context.controller';
import { CreateStoryContextUseCase } from 'src/modules/labs/story-context/application/create-story-context.use-case';
import { GetStoryContextUseCase } from 'src/modules/labs/story-context/application/get-story-context.use-case';
import { GetUserStoryContextsUseCase } from 'src/modules/labs/story-context/application/get-user-story-contexts.use-case';
import { UpdateStoryContextUseCase } from 'src/modules/labs/story-context/application/update-story-context.use-case';
import { DeleteStoryContextUseCase } from 'src/modules/labs/story-context/application/delete-story-context.use-case';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: StoryContext.name, schema: StoryContextSchema },
    ]),
  ],
  controllers: [StoryContextController],
  providers: [
    MongoStoryContextRepository,
    PrismaStoryContextRepository,
    backendProvider<StoryContextRepository>(
      STORY_CONTEXT_REPOSITORY,
      MongoStoryContextRepository,
      PrismaStoryContextRepository,
    ),
    CreateStoryContextUseCase,
    GetStoryContextUseCase,
    GetUserStoryContextsUseCase,
    UpdateStoryContextUseCase,
    DeleteStoryContextUseCase,
  ],
})
export class StoryContextModule {}
