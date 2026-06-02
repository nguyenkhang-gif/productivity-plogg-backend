import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class DeletePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(id: string, requesterId: string): Promise<void> {
    const post = await this.postRepo.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== requesterId) throw new ForbiddenException('Not your post');

    await this.postRepo.delete(id);

    await Promise.all([
      this.cache.delByPattern(`post:${id}:*`),
      this.cache.delByPattern('posts:all:*'),
      this.cache.delByPattern(`posts:author:${post.authorId}:*`),
    ]);
  }
}
