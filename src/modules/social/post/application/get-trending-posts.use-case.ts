import { Inject, Injectable } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { Post } from 'src/modules/social/post/domain/post.entity';

@Injectable()
export class GetTrendingPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(limit: number, currentUserId: string): Promise<Post[]> {
    return this.postRepo.findTrending(limit, currentUserId);
  }
}
