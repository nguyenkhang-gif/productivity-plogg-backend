import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { Types } from 'mongoose';

export interface UnsharePostResult {
  action: 'unshared';
  shareCount: number;
}

@Injectable()
export class UnsharePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(
    originalPostId: string,
    userId: string,
  ): Promise<UnsharePostResult> {
    if (!Types.ObjectId.isValid(originalPostId))
      throw new NotFoundException('Post not found');
    const original = await this.postRepo.findById(originalPostId, userId);
    if (!original) throw new NotFoundException('Post not found');

    const repost = await this.postRepo.findRepostByUser(originalPostId, userId);
    if (!repost) throw new NotFoundException('Share not found');
    if (repost.authorId !== userId) throw new ForbiddenException();

    await this.postRepo.delete(repost.id);
    await this.postRepo.decrementShareCount(originalPostId);
    const shareCount = await this.postRepo.getShareCount(originalPostId);

    return { action: 'unshared', shareCount };
  }
}
