import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { Post } from 'src/core/domain/entities/post.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class ApprovePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(postId: string, moderatorId: string): Promise<Post> {
    const post = await this.postRepo.findByIdRaw(postId);
    if (!post) throw new NotFoundException('Post not found');
    if (post.visibility !== 'PUBLIC') {
      throw new BadRequestException('Only PUBLIC posts go through moderation');
    }

    const updated = await this.postRepo.setModerationStatus(
      postId,
      'APPROVED',
      moderatorId,
    );

    await Promise.all([
      this.cache.delByPattern(`post:${postId}:*`),
      this.cache.delByPattern('posts:all:*'),
      this.cache.delByPattern(`posts:author:${post.authorId}:*`),
    ]);

    return updated;
  }
}
