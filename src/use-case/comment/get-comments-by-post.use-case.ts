import { Inject, Injectable } from '@nestjs/common';
import {
  COMMENT_REPOSITORY,
  CommentRepository,
  PaginatedComments,
} from 'src/core/domain/repositories/comment.repository.interface';

@Injectable()
export class GetCommentsByPostUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly commentRepo: CommentRepository,
  ) {}

  async execute(postId: string, page = 1, limit = 20): Promise<PaginatedComments> {
    return this.commentRepo.findByPost(postId, page, limit);
  }
}
