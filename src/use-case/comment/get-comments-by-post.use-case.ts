import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  COMMENT_REPOSITORY,
  CommentRepository,
  PaginatedComments,
} from 'src/core/domain/repositories/comment.repository.interface';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';

@Injectable()
export class GetCommentsByPostUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly commentRepo: CommentRepository,
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(
    postId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedComments> {
    const post = await this.postRepo.findById(postId, userId);
    if (!post) throw new NotFoundException('Post not found');
    return this.commentRepo.findByPost(postId, page, limit);
  }
}
