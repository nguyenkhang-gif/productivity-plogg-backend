import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BOOKMARK_REPOSITORY, BookmarkRepository } from 'src/core/domain/repositories/bookmark.repository.interface';
import { POST_REPOSITORY, PostRepository } from 'src/core/domain/repositories/post.repository.interface';

@Injectable()
export class AddBookmarkUseCase {
  constructor(
    @Inject(BOOKMARK_REPOSITORY) private readonly bookmarkRepo: BookmarkRepository,
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(userId: string, postId: string): Promise<void> {
    const post = await this.postRepo.findById(postId, userId);
    if (!post) throw new NotFoundException('Post not found');
    await this.bookmarkRepo.upsert(userId, postId);
  }
}
