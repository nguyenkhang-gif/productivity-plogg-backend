import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from 'src/infrastructure/databases/schemas/post.schema';
import { User, UserSchema } from 'src/infrastructure/databases/schemas/user.schema';
import { Friendship, FriendshipSchema } from 'src/infrastructure/databases/schemas/friendship.schema';
import { MongoPostRepository } from 'src/infrastructure/databases/repositories/post.repository';
import { POST_REPOSITORY } from 'src/core/domain/repositories/post.repository.interface';
import { PostController } from 'src/presentation/controllers/post.controller';
import { CreatePostUseCase } from 'src/use-case/post/create-post.use-case';
import { GetPostsUseCase } from 'src/use-case/post/get-posts.use-case';
import { GetPostUseCase } from 'src/use-case/post/get-post.use-case';
import { GetPostsByAuthorUseCase } from 'src/use-case/post/get-posts-by-author.use-case';
import { UpdatePostUseCase } from 'src/use-case/post/update-post.use-case';
import { DeletePostUseCase } from 'src/use-case/post/delete-post.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
  ],
  controllers: [PostController],
  providers: [
    { provide: POST_REPOSITORY, useClass: MongoPostRepository },
    CreatePostUseCase,
    GetPostsUseCase,
    GetPostUseCase,
    GetPostsByAuthorUseCase,
    UpdatePostUseCase,
    DeletePostUseCase,
  ],
})
export class PostModule {}
