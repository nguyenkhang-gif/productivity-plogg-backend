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
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly commentRepo: CommentRepository,
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(id: string, requesterId: string): Promise<void> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== requesterId)
      throw new ForbiddenException('Not your comment');
    await this.commentRepo.delete(id);
    await this.postRepo.incrementCommentCount(comment.postId, -1);
    // cache post chứa `commentCount` — xem ghi chú ở ToggleReactionUseCase
    await this.cache.delByPattern(`post:${comment.postId}:*`);
  }
}
