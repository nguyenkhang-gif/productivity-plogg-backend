import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { Post } from 'src/modules/social/post/domain/post.entity';
import { CacheService } from 'src/shared/cache/cache.service';

@Injectable()
export class RejectPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(
    postId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<Post> {
    const post = await this.postRepo.findByIdRaw(postId);
    if (!post) throw new NotFoundException('Post not found');
    if (post.visibility !== 'PUBLIC') {
      throw new BadRequestException('Only PUBLIC posts go through moderation');
    }

    const updated = await this.postRepo.setModerationStatus(
      postId,
      'REJECTED',
      moderatorId,
      reason ?? null,
    );

    await Promise.all([
      this.cache.delByPattern(`post:${postId}:*`),
      this.cache.delByPattern('posts:all:*'),
      this.cache.delByPattern(`posts:author:${post.authorId}:*`),
    ]);

    return updated;
  }
}
