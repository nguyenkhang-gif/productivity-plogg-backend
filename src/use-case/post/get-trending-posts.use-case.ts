import { Inject, Injectable } from '@nestjs/common';
import { POST_REPOSITORY, PostRepository } from 'src/core/domain/repositories/post.repository.interface';
import { Post } from 'src/core/domain/entities/post.entity';

@Injectable()
export class GetTrendingPostsUseCase {
  constructor(@Inject(POST_REPOSITORY) private readonly postRepo: PostRepository) {}

  async execute(limit: number, currentUserId: string): Promise<Post[]> {
    return this.postRepo.findTrending(limit, currentUserId);
  }
}
