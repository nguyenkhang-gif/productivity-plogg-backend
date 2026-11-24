import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedPosts,
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { AdminPostQueryDto } from 'src/modules/social/post/application/dto/admin-post-query.dto';

@Injectable()
export class AdminGetAllPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(query: AdminPostQueryDto): Promise<PaginatedPosts> {
    return this.postRepo.findAllAdmin({
      search: query.search,
      authorId: query.authorId,
      moderationStatus: query.moderationStatus,
      visibility: query.visibility,
      page: query.page,
      limit: query.limit,
    });
  }
}
