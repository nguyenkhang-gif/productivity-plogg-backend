import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BOOKMARK_REPOSITORY,
  BookmarkRepository,
} from 'src/modules/social/bookmark/domain/bookmark.repository.interface';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { RelationshipService } from 'src/modules/social/friendship/application/relationship.service';

@Injectable()
export class AddBookmarkUseCase {
  constructor(
    @Inject(BOOKMARK_REPOSITORY)
    private readonly bookmarkRepo: BookmarkRepository,
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly relationships: RelationshipService,
  ) {}

  async execute(userId: string, postId: string): Promise<void> {
    const blockedAuthorIds = await this.relationships.getBlockedIds(userId);
    const post = await this.postRepo.findById(postId, userId, {
      blockedAuthorIds,
    });
    if (!post) throw new NotFoundException('Post not found');
    await this.bookmarkRepo.upsert(userId, postId);
  }
}
