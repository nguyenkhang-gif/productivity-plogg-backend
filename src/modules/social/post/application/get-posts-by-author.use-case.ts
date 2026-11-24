import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedPosts,
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { RelationshipService } from 'src/modules/social/friendship/application/relationship.service';
import { canViewAuthorPage } from 'src/modules/social/post/domain/post.policy';
import { CacheService } from 'src/shared/cache/cache.service';
import { CACHE_TTL } from 'src/shared/cache/cache-ttl.constant';

@Injectable()
export class GetPostsByAuthorUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
    private readonly relationships: RelationshipService,
  ) {}

  async execute(
    authorId: string,
    page = 1,
    limit = 10,
    currentUserId: string,
  ): Promise<PaginatedPosts> {
    const key = `posts:author:${authorId}:${currentUserId}:${page}:${limit}`;
    const cached = await this.cache.get<PaginatedPosts>(key);
    if (cached) return cached;

    const relationship = await this.relationships.getRelationship(
      currentUserId,
      authorId,
    );
    if (
      !canViewAuthorPage({ id: currentUserId }, { id: authorId }, relationship)
    ) {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const result = await this.postRepo.findByAuthor(
      authorId,
      page,
      limit,
      currentUserId,
    );
    await this.cache.set(key, result, CACHE_TTL.POST_BY_AUTHOR);
    return result;
  }
}
