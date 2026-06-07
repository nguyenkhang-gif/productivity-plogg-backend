import { Inject, Injectable } from '@nestjs/common';
import { POST_REPOSITORY, PostRepository } from 'src/core/domain/repositories/post.repository.interface';

@Injectable()
export class IncrementViewUseCase {
  constructor(@Inject(POST_REPOSITORY) private readonly postRepo: PostRepository) {}

  async execute(postId: string, requesterId: string): Promise<void> {
    const post = await this.postRepo.findById(postId);
    if (!post) return;
    if (post.authorId === requesterId) return;
    await this.postRepo.incrementViewCount(postId);
  }
}
