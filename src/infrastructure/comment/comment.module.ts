import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema } from 'src/infrastructure/databases/schemas/comment.schema';
import { Post, PostSchema } from 'src/infrastructure/databases/schemas/post.schema';
import { MongoCommentRepository } from 'src/infrastructure/databases/repositories/comment.repository';
import { MongoPostRepository } from 'src/infrastructure/databases/repositories/post.repository';
import { COMMENT_REPOSITORY } from 'src/core/domain/repositories/comment.repository.interface';
import { POST_REPOSITORY } from 'src/core/domain/repositories/post.repository.interface';
import { CommentController } from 'src/presentation/controllers/comment.controller';
import { CreateCommentUseCase } from 'src/use-case/comment/create-comment.use-case';
import { GetCommentsByPostUseCase } from 'src/use-case/comment/get-comments-by-post.use-case';
import { UpdateCommentUseCase } from 'src/use-case/comment/update-comment.use-case';
import { DeleteCommentUseCase } from 'src/use-case/comment/delete-comment.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [CommentController],
  providers: [
    { provide: COMMENT_REPOSITORY, useClass: MongoCommentRepository },
    { provide: POST_REPOSITORY, useClass: MongoPostRepository },
    CreateCommentUseCase,
    GetCommentsByPostUseCase,
    UpdateCommentUseCase,
    DeleteCommentUseCase,
  ],
})
export class CommentModule {}
