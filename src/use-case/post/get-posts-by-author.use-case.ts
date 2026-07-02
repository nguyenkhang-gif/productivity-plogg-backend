import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedPosts,
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { CACHE_TTL } from 'src/infrastructure/cache/cache-ttl.constant';

@Injectable()
export class GetPostsByAuthorUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
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
