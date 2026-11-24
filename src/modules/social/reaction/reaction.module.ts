import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Reaction,
  ReactionSchema,
} from 'src/modules/social/reaction/infrastructure/reaction.schema';
import { MongoReactionRepository } from 'src/modules/social/reaction/infrastructure/reaction.repository';
import { REACTION_REPOSITORY } from 'src/modules/social/reaction/domain/reaction.repository.interface';
import {
  Post,
  PostSchema,
} from 'src/modules/social/post/infrastructure/post.schema';
import {
  User,
  UserSchema,
} from 'src/modules/identity/user/infrastructure/user.schema';
import {
  Friendship,
  FriendshipSchema,
} from 'src/modules/social/friendship/infrastructure/friendship.schema';
import { MongoPostRepository } from 'src/modules/social/post/infrastructure/post.repository';
import { POST_REPOSITORY } from 'src/modules/social/post/domain/post.repository.interface';
import { ReactionController } from 'src/modules/social/reaction/presentation/reaction.controller';
import { ToggleReactionUseCase } from 'src/modules/social/reaction/application/toggle-reaction.use-case';
import { RemoveReactionUseCase } from 'src/modules/social/reaction/application/remove-reaction.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reaction.name, schema: ReactionSchema },
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Friendship.name, schema: FriendshipSchema },
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
