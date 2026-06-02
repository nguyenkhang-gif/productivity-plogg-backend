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
import { Post } from 'src/core/domain/entities/post.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';

export interface UpdatePostInput {
  content?: string;
  imageUrls?: string[];
  isPublished?: boolean;
}

@Injectable()
export class UpdatePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(id: string, requesterId: string, input: UpdatePostInput): Promise<Post> {
    const post = await this.postRepo.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== requesterId) throw new ForbiddenException('Not your post');

    const updated = await this.postRepo.update(id, input);

    await Promise.all([
      this.cache.delByPattern(`post:${id}:*`),
      this.cache.delByPattern('posts:all:*'),
      this.cache.delByPattern(`posts:author:${post.authorId}:*`),
    ]);

    return updated;
  }
}
