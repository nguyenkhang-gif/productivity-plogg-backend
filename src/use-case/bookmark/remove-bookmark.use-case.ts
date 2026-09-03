import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKMARK_REPOSITORY,
  BookmarkRepository,
} from 'src/core/domain/repositories/bookmark.repository.interface';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class RemoveBookmarkUseCase {
  constructor(
    @Inject(BOOKMARK_REPOSITORY)
    private readonly bookmarkRepo: BookmarkRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(userId: string, postId: string): Promise<void> {
    await this.bookmarkRepo.delete(userId, postId);
    // cache post chứa `isBookmarked` (riêng từng người xem)
    await this.cache.delByPattern(`post:${postId}:*`);
  }
}
