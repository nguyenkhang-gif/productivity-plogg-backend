import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { POST_REPOSITORY, PostRepository } from 'src/core/domain/repositories/post.repository.interface';
import { Types } from 'mongoose';

export interface ShareInfo {
  shareCount: number;
  hasShared: boolean;
}

@Injectable()
export class GetShareInfoUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(postId: string, userId?: string): Promise<ShareInfo> {
    if (!Types.ObjectId.isValid(postId)) throw new NotFoundException('Post not found');
    const shareCount = await this.postRepo.getShareCount(postId);

    let hasShared = false;
    if (userId) {
      const repost = await this.postRepo.findRepostByUser(postId, userId);
      hasShared = !!repost;
    }

    return { shareCount, hasShared };
  }
}
