import { Inject, Injectable } from '@nestjs/common';
import { POST_REPOSITORY, PostRepository, PostStats } from 'src/core/domain/repositories/post.repository.interface';
import { BOOKMARK_REPOSITORY, BookmarkRepository } from 'src/core/domain/repositories/bookmark.repository.interface';

export interface MyStatsResult extends PostStats {
  bookmarkCount: number;
}

@Injectable()
export class GetMyStatsUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    @Inject(BOOKMARK_REPOSITORY) private readonly bookmarkRepo: BookmarkRepository,
  ) {}

  async execute(userId: string): Promise<MyStatsResult> {
    const [stats, bookmarkCount] = await Promise.all([
      this.postRepo.getStatsByAuthor(userId),
      this.bookmarkRepo.countByUser(userId),
    ]);
    return { ...stats, bookmarkCount };
  }
}
