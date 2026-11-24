import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
import {
  Tag,
  TagSchema,
} from 'src/modules/social/tag/infrastructure/tag.schema';
import {
  Category,
  CategorySchema,
} from 'src/modules/social/category/infrastructure/category.schema';
import {
  Bookmark,
  BookmarkSchema,
} from 'src/modules/social/bookmark/infrastructure/bookmark.schema';
import { MongoPostRepository } from 'src/modules/social/post/infrastructure/post.repository';
import { PrismaPostRepository } from 'src/modules/social/post/infrastructure/post.prisma.repository';
import { PrismaTagRepository } from 'src/modules/social/tag/infrastructure/tag.prisma.repository';
import { PrismaCategoryRepository } from 'src/modules/social/category/infrastructure/category.prisma.repository';
import { PrismaBookmarkRepository } from 'src/modules/social/bookmark/infrastructure/bookmark.prisma.repository';
import { backendProvider } from 'src/shared/database/backend-provider';
import { PrismaModule } from 'src/shared/database/prisma.module';
import type { PostRepository } from 'src/modules/social/post/domain/post.repository.interface';
import type { TagRepository } from 'src/modules/social/tag/domain/tag.repository.interface';
import type { CategoryRepository } from 'src/modules/social/category/domain/category.repository.interface';
import type { BookmarkRepository } from 'src/modules/social/bookmark/domain/bookmark.repository.interface';
import { MongoTagRepository } from 'src/modules/social/tag/infrastructure/tag.repository';
import { MongoCategoryRepository } from 'src/modules/social/category/infrastructure/category.repository';
import { MongoBookmarkRepository } from 'src/modules/social/bookmark/infrastructure/bookmark.repository';
import { POST_REPOSITORY } from 'src/modules/social/post/domain/post.repository.interface';
import { TAG_REPOSITORY } from 'src/modules/social/tag/domain/tag.repository.interface';
import { CATEGORY_REPOSITORY } from 'src/modules/social/category/domain/category.repository.interface';
import { BOOKMARK_REPOSITORY } from 'src/modules/social/bookmark/domain/bookmark.repository.interface';
import { PostController } from 'src/modules/social/post/presentation/post.controller';
import { AdminPostController } from 'src/modules/social/post/presentation/admin-post.controller';
import { AdminGetAllPostsUseCase } from 'src/modules/social/post/application/admin-get-all-posts.use-case';
import { AdminGetPostUseCase } from 'src/modules/social/post/application/admin-get-post.use-case';
import { AdminForceDeletePostUseCase } from 'src/modules/social/post/application/admin-force-delete-post.use-case';
import { TagController } from 'src/modules/social/tag/presentation/tag.controller';
import { CategoryController } from 'src/modules/social/category/presentation/category.controller';
import { ShareController } from 'src/modules/social/share/presentation/share.controller';
import { SharePostUseCase } from 'src/modules/social/share/application/share-post.use-case';
import { UnsharePostUseCase } from 'src/modules/social/share/application/unshare-post.use-case';
import { GetShareInfoUseCase } from 'src/modules/social/share/application/get-share-info.use-case';
import { CreatePostUseCase } from 'src/modules/social/post/application/create-post.use-case';
import { GetPostsUseCase } from 'src/modules/social/post/application/get-posts.use-case';
import { GetPostUseCase } from 'src/modules/social/post/application/get-post.use-case';
import { GetPostsByAuthorUseCase } from 'src/modules/social/post/application/get-posts-by-author.use-case';
import { UpdatePostUseCase } from 'src/modules/social/post/application/update-post.use-case';
import { DeletePostUseCase } from 'src/modules/social/post/application/delete-post.use-case';
import { IncrementViewUseCase } from 'src/modules/social/post/application/increment-view.use-case';
import { GetTrendingPostsUseCase } from 'src/modules/social/post/application/get-trending-posts.use-case';
import { GetMyStatsUseCase } from 'src/modules/social/post/application/get-my-stats.use-case';
import { GetPendingPostsUseCase } from 'src/modules/social/post/application/get-pending-posts.use-case';
import { ApprovePostUseCase } from 'src/modules/social/post/application/approve-post.use-case';
import { RejectPostUseCase } from 'src/modules/social/post/application/reject-post.use-case';
import { AddBookmarkUseCase } from 'src/modules/social/bookmark/application/add-bookmark.use-case';
import { RemoveBookmarkUseCase } from 'src/modules/social/bookmark/application/remove-bookmark.use-case';
import { SearchTagsUseCase } from 'src/modules/social/tag/application/search-tags.use-case';
import { GetTrendingTagsUseCase } from 'src/modules/social/tag/application/get-trending-tags.use-case';
import { GetCategoriesUseCase } from 'src/modules/social/category/application/get-categories.use-case';
import { CreateCategoryUseCase } from 'src/modules/social/category/application/create-category.use-case';
import { UpdateCategoryUseCase } from 'src/modules/social/category/application/update-category.use-case';
import { DeleteCategoryUseCase } from 'src/modules/social/category/application/delete-category.use-case';

import { FriendshipModule } from 'src/modules/social/friendship/friendship.module';

@Module({
  imports: [
    PrismaModule,
    FriendshipModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: Tag.name, schema: TagSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Bookmark.name, schema: BookmarkSchema },
    ]),
  ],
  controllers: [
    ShareController,
    PostController,
    AdminPostController,
    TagController,
    CategoryController,
  ],
  providers: [
    MongoPostRepository,
    PrismaPostRepository,
    MongoTagRepository,
    PrismaTagRepository,
    MongoCategoryRepository,
    PrismaCategoryRepository,
    MongoBookmarkRepository,
    PrismaBookmarkRepository,
    backendProvider<PostRepository>(
      POST_REPOSITORY,
      MongoPostRepository,
      PrismaPostRepository,
    ),
    backendProvider<TagRepository>(
      TAG_REPOSITORY,
      MongoTagRepository,
      PrismaTagRepository,
    ),
    backendProvider<CategoryRepository>(
      CATEGORY_REPOSITORY,
      MongoCategoryRepository,
      PrismaCategoryRepository,
    ),
    backendProvider<BookmarkRepository>(
      BOOKMARK_REPOSITORY,
      MongoBookmarkRepository,
      PrismaBookmarkRepository,
    ),
    CreatePostUseCase,
    GetPostsUseCase,
    GetPostUseCase,
    GetPostsByAuthorUseCase,
    UpdatePostUseCase,
    DeletePostUseCase,
    IncrementViewUseCase,
    GetTrendingPostsUseCase,
    GetMyStatsUseCase,
    GetPendingPostsUseCase,
    ApprovePostUseCase,
    RejectPostUseCase,
    AddBookmarkUseCase,
    RemoveBookmarkUseCase,
    SearchTagsUseCase,
    GetTrendingTagsUseCase,
    GetCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    SharePostUseCase,
    UnsharePostUseCase,
    GetShareInfoUseCase,
    AdminGetAllPostsUseCase,
    AdminGetPostUseCase,
    AdminForceDeletePostUseCase,
  ],
  exports: [POST_REPOSITORY],
})
export class PostModule {}
