import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Bookmark,
  BookmarkSchema,
} from 'src/modules/social/bookmark/infrastructure/bookmark.schema';
import { MongoBookmarkRepository } from 'src/modules/social/bookmark/infrastructure/bookmark.repository';
import { PrismaBookmarkRepository } from 'src/modules/social/bookmark/infrastructure/bookmark.prisma.repository';
import { backendProvider } from 'src/shared/database/backend-provider';
import { PrismaModule } from 'src/shared/database/prisma.module';
import type { BookmarkRepository } from 'src/modules/social/bookmark/domain/bookmark.repository.interface';
import { BOOKMARK_REPOSITORY } from 'src/modules/social/bookmark/domain/bookmark.repository.interface';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: Bookmark.name, schema: BookmarkSchema },
    ]),
  ],
  providers: [
    MongoBookmarkRepository,
    PrismaBookmarkRepository,
    backendProvider<BookmarkRepository>(
      BOOKMARK_REPOSITORY,
      MongoBookmarkRepository,
      PrismaBookmarkRepository,
    ),
  ],
  exports: [BOOKMARK_REPOSITORY],
})
export class BookmarkModule {}
