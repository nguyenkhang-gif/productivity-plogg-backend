import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  REACTION_REPOSITORY,
  ReactionRepository,
} from 'src/modules/social/reaction/domain/reaction.repository.interface';
import {
  POST_REPOSITORY,
  PostRepository,
} from 'src/modules/social/post/domain/post.repository.interface';
import { Reaction } from 'src/modules/social/reaction/domain/reaction.entity';
import { canReact } from 'src/modules/social/post/domain/post.policy';
import { RelationshipService } from 'src/modules/social/friendship/application/relationship.service';

@Injectable()
export class ToggleReactionUseCase {
  constructor(
    @Inject(REACTION_REPOSITORY)
    private readonly reactionRepo: ReactionRepository,
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
    private readonly relationships: RelationshipService,
  ) {}

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
      await this.reactionRepo.deleteByPostAndUser(postId, userId);
      return { action: 'removed', reaction: null };
    }

    const relationship = await this.relationships.getRelationship(
      userId,
      post.authorId,
    );
    if (!canReact({ id: userId }, post, null, relationship))
      throw new ForbiddenException('You cannot interact with this user');

    const reaction = await this.reactionRepo.save(
      new Reaction({ postId, userId, type, icon }),
    );

    return { action: existing ? 'changed' : 'added', reaction };
  }
}
