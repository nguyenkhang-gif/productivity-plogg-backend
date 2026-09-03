import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  COMMENT_REPOSITORY,
  CommentRepository,
} from 'src/core/domain/repositories/comment.repository.interface';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { Comment } from 'src/core/domain/entities/comment.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';

export interface CreateCommentInput {
  postId: string;
  authorId: string;
  content: string;
  iconUrl?: string;
}

@Injectable()
export class CreateCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly commentRepo: CommentRepository,
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
  ) {}

  async execute(input: CreateCommentInput): Promise<Comment> {
    const post = await this.postRepo.findById(input.postId, input.authorId);

    if (!post) throw new NotFoundException('Post not found');
    const comment = await this.commentRepo.create(
      new Comment({
        postId: input.postId,
        authorId: input.authorId,
        content: input.content,
        iconUrl: input.iconUrl,
      }),
    );

    await this.postRepo.incrementCommentCount(input.postId, +1);
    // cache post chứa `commentCount` — xem ghi chú ở ToggleReactionUseCase
    await this.cache.delByPattern(`post:${input.postId}:*`);

    return comment;
  }
}
