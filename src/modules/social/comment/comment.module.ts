import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Comment,
  CommentSchema,
} from 'src/modules/social/comment/infrastructure/comment.schema';
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
import { MongoCommentRepository } from 'src/modules/social/comment/infrastructure/comment.repository';
import { PrismaCommentRepository } from 'src/modules/social/comment/infrastructure/comment.prisma.repository';
import { PrismaPostRepository } from 'src/modules/social/post/infrastructure/post.prisma.repository';
import { backendProvider } from 'src/shared/database/backend-provider';
import { PrismaModule } from 'src/shared/database/prisma.module';
import type { CommentRepository } from 'src/modules/social/comment/domain/comment.repository.interface';
import type { PostRepository } from 'src/modules/social/post/domain/post.repository.interface';
import { MongoPostRepository } from 'src/modules/social/post/infrastructure/post.repository';
import { COMMENT_REPOSITORY } from 'src/modules/social/comment/domain/comment.repository.interface';
import { POST_REPOSITORY } from 'src/modules/social/post/domain/post.repository.interface';
import { CommentController } from 'src/modules/social/comment/presentation/comment.controller';
import { CreateCommentUseCase } from 'src/modules/social/comment/application/create-comment.use-case';
import { GetCommentsByPostUseCase } from 'src/modules/social/comment/application/get-comments-by-post.use-case';
import { UpdateCommentUseCase } from 'src/modules/social/comment/application/update-comment.use-case';
import { DeleteCommentUseCase } from 'src/modules/social/comment/application/delete-comment.use-case';

import { FriendshipModule } from 'src/modules/social/friendship/friendship.module';

@Module({
  imports: [
    PrismaModule,
    FriendshipModule,
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
  ],
  controllers: [CommentController],
  providers: [
    MongoCommentRepository,
    PrismaCommentRepository,
    MongoPostRepository,
    PrismaPostRepository,
    backendProvider<CommentRepository>(
      COMMENT_REPOSITORY,
      MongoCommentRepository,
      PrismaCommentRepository,
    ),
    backendProvider<PostRepository>(
      POST_REPOSITORY,
      MongoPostRepository,
      PrismaPostRepository,
    ),
    CreateCommentUseCase,
    GetCommentsByPostUseCase,
    UpdateCommentUseCase,
    DeleteCommentUseCase,
  ],
})
export class CommentModule {}
