import { Inject, Injectable } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { RelationshipService } from 'src/modules/social/friendship/application/relationship.service';

@Injectable()
export class IncrementViewUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly relationships: RelationshipService,
  ) {}

  async execute(postId: string, requesterId: string): Promise<void> {
    const blockedAuthorIds =
      await this.relationships.getBlockedIds(requesterId);
    const post = await this.postRepo
      .findById(postId, requesterId, { blockedAuthorIds })
      .catch(() => null);
    if (!post) return;
    if (post.authorId === requesterId) return;
    await this.postRepo.incrementViewCount(postId);
  }
}
