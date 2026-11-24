import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from 'src/modules/social/category/domain/category.repository.interface';
import {
  TAG_REPOSITORY,
  TagRepository,
} from 'src/modules/social/tag/domain/tag.repository.interface';
import { CacheService } from 'src/shared/cache/cache.service';

@Injectable()
export class AdminForceDeletePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: CategoryRepository,
    @Inject(TAG_REPOSITORY) private readonly tagRepo: TagRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(postId: string): Promise<void> {
    const post = await this.postRepo.findByIdRaw(postId);
    if (!post) throw new NotFoundException('Post not found');

    await this.postRepo.delete(postId);

    await Promise.all([
      post.categoryId
        ? this.categoryRepo.decrementPostCount(post.categoryId)
        : Promise.resolve(),
      post.tagIds?.length
        ? this.tagRepo.decrementPostCount(post.tagIds)
        : Promise.resolve(),
      this.cache.delByPattern(`post:${postId}:*`),
      this.cache.delByPattern('posts:all:*'),
      this.cache.delByPattern(`posts:author:${post.authorId}:*`),
      this.cache.del(`user:postCount:${post.authorId}`),
    ]);
  }
}
