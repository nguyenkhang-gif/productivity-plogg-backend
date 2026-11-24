import { Inject, Injectable } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { RelationshipService } from 'src/modules/social/friendship/application/relationship.service';
import { Post } from 'src/modules/social/post/domain/post.entity';

@Injectable()
export class GetTrendingPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly relationships: RelationshipService,
  ) {}

  async execute(limit: number, currentUserId: string): Promise<Post[]> {
    const blockedAuthorIds =
      await this.relationships.getBlockedIds(currentUserId);
    return this.postRepo.findTrending(limit, currentUserId, blockedAuthorIds);
  }
}
