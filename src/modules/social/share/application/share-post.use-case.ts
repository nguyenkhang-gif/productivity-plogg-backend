import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { Post } from 'src/modules/social/post/domain/post.entity';
import { canShare } from 'src/modules/social/post/domain/post.policy';
import { RelationshipService } from 'src/modules/social/friendship/application/relationship.service';
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
    private readonly relationships: RelationshipService,
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

    const relationship = await this.relationships.getRelationship(
      userId,
      original.authorId,
    );
    if (!canShare({ id: userId }, original, null, relationship))
      throw new ForbiddenException('You cannot interact with this user');
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
