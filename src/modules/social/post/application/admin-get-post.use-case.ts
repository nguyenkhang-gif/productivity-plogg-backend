import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { Post } from 'src/modules/social/post/domain/post.entity';

@Injectable()
export class AdminGetPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(postId: string): Promise<Post> {
    const post = await this.postRepo.findByIdRaw(postId);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }
}
