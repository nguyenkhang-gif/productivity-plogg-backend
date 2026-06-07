import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from 'src/infrastructure/databases/schemas/post.schema';
import { User, UserSchema } from 'src/infrastructure/databases/schemas/user.schema';
import { Friendship, FriendshipSchema } from 'src/infrastructure/databases/schemas/friendship.schema';
import { Tag, TagSchema } from 'src/infrastructure/databases/schemas/tag.schema';
import { Category, CategorySchema } from 'src/infrastructure/databases/schemas/category.schema';
import { Bookmark, BookmarkSchema } from 'src/infrastructure/databases/schemas/bookmark.schema';
import { MongoPostRepository } from 'src/infrastructure/databases/repositories/post.repository';
import { MongoTagRepository } from 'src/infrastructure/databases/repositories/tag.repository';
import { MongoCategoryRepository } from 'src/infrastructure/databases/repositories/category.repository';
import { MongoBookmarkRepository } from 'src/infrastructure/databases/repositories/bookmark.repository';
import { POST_REPOSITORY } from 'src/core/domain/repositories/post.repository.interface';
import { TAG_REPOSITORY } from 'src/core/domain/repositories/tag.repository.interface';
import { CATEGORY_REPOSITORY } from 'src/core/domain/repositories/category.repository.interface';
import { BOOKMARK_REPOSITORY } from 'src/core/domain/repositories/bookmark.repository.interface';
import { PostController } from 'src/presentation/controllers/post.controller';
import { TagController } from 'src/presentation/controllers/tag.controller';
import { CategoryController } from 'src/presentation/controllers/category.controller';
import { CreatePostUseCase } from 'src/use-case/post/create-post.use-case';
import { GetPostsUseCase } from 'src/use-case/post/get-posts.use-case';
import { GetPostUseCase } from 'src/use-case/post/get-post.use-case';
import { GetPostsByAuthorUseCase } from 'src/use-case/post/get-posts-by-author.use-case';
import { UpdatePostUseCase } from 'src/use-case/post/update-post.use-case';
import { DeletePostUseCase } from 'src/use-case/post/delete-post.use-case';
import { IncrementViewUseCase } from 'src/use-case/post/increment-view.use-case';
import { GetTrendingPostsUseCase } from 'src/use-case/post/get-trending-posts.use-case';
import { GetMyStatsUseCase } from 'src/use-case/post/get-my-stats.use-case';
import { AddBookmarkUseCase } from 'src/use-case/bookmark/add-bookmark.use-case';
import { RemoveBookmarkUseCase } from 'src/use-case/bookmark/remove-bookmark.use-case';
import { SearchTagsUseCase } from 'src/use-case/tag/search-tags.use-case';
import { GetTrendingTagsUseCase } from 'src/use-case/tag/get-trending-tags.use-case';
import { GetCategoriesUseCase } from 'src/use-case/category/get-categories.use-case';
import { CreateCategoryUseCase } from 'src/use-case/category/create-category.use-case';
import { UpdateCategoryUseCase } from 'src/use-case/category/update-category.use-case';
import { DeleteCategoryUseCase } from 'src/use-case/category/delete-category.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: Tag.name, schema: TagSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Bookmark.name, schema: BookmarkSchema },
    ]),
  ],
  controllers: [PostController, TagController, CategoryController],
  providers: [
    { provide: POST_REPOSITORY, useClass: MongoPostRepository },
    { provide: TAG_REPOSITORY, useClass: MongoTagRepository },
    { provide: CATEGORY_REPOSITORY, useClass: MongoCategoryRepository },
    { provide: BOOKMARK_REPOSITORY, useClass: MongoBookmarkRepository },
    CreatePostUseCase,
    GetPostsUseCase,
    GetPostUseCase,
    GetPostsByAuthorUseCase,
    UpdatePostUseCase,
    DeletePostUseCase,
    IncrementViewUseCase,
    GetTrendingPostsUseCase,
    GetMyStatsUseCase,
    AddBookmarkUseCase,
    RemoveBookmarkUseCase,
    SearchTagsUseCase,
    GetTrendingTagsUseCase,
    GetCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
  ],
})
export class PostModule {}
