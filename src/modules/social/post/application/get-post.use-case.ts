import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { Post } from 'src/modules/social/post/domain/post.entity';
import { CacheService } from 'src/shared/cache/cache.service';
import { CACHE_TTL } from 'src/shared/cache/cache-ttl.constant';

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(id: string, currentUserId?: string): Promise<Post> {
    const key = `post:${id}:${currentUserId ?? 'anon'}`;
    const cached = await this.cache.get<Post>(key);
    if (cached) return cached;

    const post = await this.postRepo.findById(id, currentUserId);
    if (!post) throw new NotFoundException('Post not found');

    await this.cache.set(key, post, CACHE_TTL.POST_SINGLE);
    return post;
  }
}
