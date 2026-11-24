import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Bookmark,
  BookmarkSchema,
} from 'src/modules/social/bookmark/infrastructure/bookmark.schema';
import { MongoBookmarkRepository } from 'src/modules/social/bookmark/infrastructure/bookmark.repository';
import { BOOKMARK_REPOSITORY } from 'src/modules/social/bookmark/domain/bookmark.repository.interface';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bookmark.name, schema: BookmarkSchema },
    ]),
  ],
  providers: [
    { provide: BOOKMARK_REPOSITORY, useClass: MongoBookmarkRepository },
  ],
  exports: [BOOKMARK_REPOSITORY],
})
export class BookmarkModule {}
