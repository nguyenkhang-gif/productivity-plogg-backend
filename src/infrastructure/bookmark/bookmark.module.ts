import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bookmark, BookmarkSchema } from 'src/infrastructure/databases/schemas/bookmark.schema';
import { MongoBookmarkRepository } from 'src/infrastructure/databases/repositories/bookmark.repository';
import { BOOKMARK_REPOSITORY } from 'src/core/domain/repositories/bookmark.repository.interface';

@Module({
  imports: [MongooseModule.forFeature([{ name: Bookmark.name, schema: BookmarkSchema }])],
  providers: [{ provide: BOOKMARK_REPOSITORY, useClass: MongoBookmarkRepository }],
  exports: [BOOKMARK_REPOSITORY],
})
export class BookmarkModule {}
