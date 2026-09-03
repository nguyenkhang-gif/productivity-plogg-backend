import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  REACTION_REPOSITORY,
  ReactionRepository,
} from 'src/core/domain/repositories/reaction.repository.interface';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/core/domain/repositories/post.repository.interface';
import { Reaction } from 'src/core/domain/entities/reaction.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class ToggleReactionUseCase {
  constructor(
    @Inject(REACTION_REPOSITORY)
    private readonly reactionRepo: ReactionRepository,
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly cache: CacheService,
  ) {}

  /**
   * Cache của post chứa `reactCount` nên phải bỏ sau khi đổi.
   *
   * CỐ Ý chỉ xoá `post:{id}:*`, KHÔNG xoá `posts:all:*`: reaction là thao tác
   * ghi tần suất cao nhất, mà `posts:all:*` là cache feed của MỌI user — xoá
   * mỗi lần có người bấm tim thì cache feed không bao giờ sống nổi. Feed chấp
   * nhận lệch tối đa 60s (TTL), FE đã optimistic-update nên gần như không thấy.
   */
  private invalidatePost(postId: string): Promise<void> {
    return this.cache.delByPattern(`post:${postId}:*`);
  }

  async execute(
    postId: string,
    userId: string,
    type: string,
    icon?: string,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction: Reaction | null;
  }> {
    const post = await this.postRepo.findById(postId, userId);
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.reactionRepo.findByPostAndUser(postId, userId);

    if (existing && existing.type === type) {
      const deleted = await this.reactionRepo.deleteByPostAndUser(
        postId,
        userId,
      );
      if (deleted) await this.postRepo.incrementReactCount(postId, -1);
      await this.invalidatePost(postId);
      return { action: 'removed', reaction: null };
    }

    const reaction = await this.reactionRepo.save(
      new Reaction({ postId, userId, type, icon }),
    );

    if (!existing) await this.postRepo.incrementReactCount(postId, +1);
    await this.invalidatePost(postId);

    return { action: existing ? 'changed' : 'added', reaction };
  }
}
