import { Inject, Injectable } from '@nestjs/common';
import { BOOKMARK_REPOSITORY, BookmarkRepository } from 'src/core/domain/repositories/bookmark.repository.interface';

@Injectable()
export class RemoveBookmarkUseCase {
  constructor(@Inject(BOOKMARK_REPOSITORY) private readonly bookmarkRepo: BookmarkRepository) {}

  async execute(userId: string, postId: string): Promise<void> {
    await this.bookmarkRepo.delete(userId, postId);
  }
}
