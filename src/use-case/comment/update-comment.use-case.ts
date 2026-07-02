import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  COMMENT_REPOSITORY,
  CommentRepository,
} from 'src/core/domain/repositories/comment.repository.interface';
import { Comment } from 'src/core/domain/entities/comment.entity';

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
    if (comment.authorId !== requesterId)
      throw new ForbiddenException('Not your comment');
    return this.commentRepo.update(id, content);
  }
}
