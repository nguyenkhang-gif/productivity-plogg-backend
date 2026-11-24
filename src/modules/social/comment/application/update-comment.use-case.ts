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
import { Comment } from 'src/modules/social/comment/domain/comment.entity';
import { canEditComment } from 'src/modules/social/comment/domain/comment.policy';

@Injectable()
export class UpdateCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly commentRepo: CommentRepository,
  ) {}

  async execute(
    id: string,
    requesterId: string,
    content: string,
  ): Promise<Comment> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (!canEditComment({ id: requesterId }, comment))
      throw new ForbiddenException('Not your comment');
    return this.commentRepo.update(id, content);
  }
}
