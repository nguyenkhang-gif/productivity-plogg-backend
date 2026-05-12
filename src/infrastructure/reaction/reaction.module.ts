import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reaction, ReactionSchema } from 'src/infrastructure/databases/schemas/reaction.schema';
import { MongoReactionRepository } from 'src/infrastructure/databases/repositories/reaction.repository';
import { REACTION_REPOSITORY } from 'src/core/domain/repositories/reaction.repository.interface';
import { Post, PostSchema } from 'src/infrastructure/databases/schemas/post.schema';
import { MongoPostRepository } from 'src/infrastructure/databases/repositories/post.repository';
import { POST_REPOSITORY } from 'src/core/domain/repositories/post.repository.interface';
import { ReactionController } from 'src/presentation/controllers/reaction.controller';
import { ToggleReactionUseCase } from 'src/use-case/reaction/toggle-reaction.use-case';
import { RemoveReactionUseCase } from 'src/use-case/reaction/remove-reaction.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reaction.name, schema: ReactionSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [ReactionController],
  providers: [
    { provide: REACTION_REPOSITORY, useClass: MongoReactionRepository },
    { provide: POST_REPOSITORY, useClass: MongoPostRepository },
    ToggleReactionUseCase,
    RemoveReactionUseCase,
  ],
})
export class ReactionModule {}
