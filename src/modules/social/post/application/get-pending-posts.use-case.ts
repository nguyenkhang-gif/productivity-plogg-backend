import { Inject, Injectable } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PaginatedPosts,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';

@Injectable()
export class GetPendingPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(page: number, limit: number): Promise<PaginatedPosts> {
    return this.postRepo.findPendingPublic(page, limit);
  }
}
