import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  COMMENT_REPOSITORY,
  CommentRepository,
} from 'src/modules/social/comment/domain/comment.repository.interface';
import { canDeleteComment } from 'src/modules/social/comment/domain/comment.policy';

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly commentRepo: CommentRepository,
  ) {}

  async execute(id: string, requesterId: string): Promise<void> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (!canDeleteComment({ id: requesterId }, comment))
      throw new ForbiddenException('Not your comment');
    await this.commentRepo.delete(id);
  }
}
