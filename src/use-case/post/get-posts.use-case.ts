import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedPosts,
  PostFeedFilter,
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { CACHE_TTL } from 'src/infrastructure/cache/cache-ttl.constant';

@Injectable()
export class GetPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(page = 1, limit = 10, currentUserId: string, filter?: PostFeedFilter): Promise<PaginatedPosts> {
    const filterKey = filter ? `:cat=${filter.categoryId ?? ''}:tags=${(filter.tags ?? []).join(',')}:excl=${filter.excludeId ?? ''}` : '';
    const key = `posts:all:${currentUserId}:${page}:${limit}${filterKey}`;
    const cached = await this.cache.get<PaginatedPosts>(key);
    if (cached) return cached;

    const result = await this.postRepo.findAll(page, limit, currentUserId, filter);
    await this.cache.set(key, result, CACHE_TTL.POST_LIST);
    return result;
  }
}
