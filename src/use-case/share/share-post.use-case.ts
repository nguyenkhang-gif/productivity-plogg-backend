import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { Post } from 'src/core/domain/entities/post.entity';
import { Types } from 'mongoose';

export interface SharePostResult {
  action: 'shared';
  shareCount: number;
  repost: Post;
}

@Injectable()
export class SharePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(
    originalPostId: string,
    userId: string,
    caption: string,
  ): Promise<SharePostResult> {
    if (!Types.ObjectId.isValid(originalPostId))
      throw new NotFoundException('Post not found');
    const original = await this.postRepo.findById(originalPostId, userId);
    if (!original) throw new NotFoundException('Post not found');
    if (original.type === 'REPOST')
      throw new BadRequestException('Cannot share a repost');

    const existing = await this.postRepo.findRepostByUser(
      originalPostId,
      userId,
    );
    if (existing) throw new ConflictException('Already shared this post');

    const repost = await this.postRepo.create(
      new Post({
        type: 'REPOST',
        authorId: userId,
        originalPostId,
        caption,
        content: '',
        isPublished: true,
        shareCount: 0,
        reactCount: 0,
      }),
    );

    await this.postRepo.incrementShareCount(originalPostId);
    const shareCount = await this.postRepo.getShareCount(originalPostId);

    return { action: 'shared', shareCount, repost };
  }
}
