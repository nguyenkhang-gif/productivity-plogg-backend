import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedPosts,
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';

@Injectable()
export class GetPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(page = 1, limit = 10, currentUserId: string): Promise<PaginatedPosts> {
    return this.postRepo.findAll(page, limit, currentUserId);
  }
}
