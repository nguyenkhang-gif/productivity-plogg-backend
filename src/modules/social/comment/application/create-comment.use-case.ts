import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  COMMENT_REPOSITORY,
  CommentRepository,
} from 'src/modules/social/comment/domain/comment.repository.interface';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { Comment } from 'src/modules/social/comment/domain/comment.entity';

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
  ) {}

  async execute(input: CreateCommentInput): Promise<Comment> {
    const post = await this.postRepo.findById(input.postId, input.authorId);
    if (!post) throw new NotFoundException('Post not found');

    return this.commentRepo.create(
      new Comment({
        postId: input.postId,
        authorId: input.authorId,
        content: input.content,
        iconUrl: input.iconUrl,
      }),
    );
  }
}
