import { Reaction } from '../entities/reaction.entity';

export const REACTION_REPOSITORY = 'REACTION_REPOSITORY';

export interface ReactionRepository {
  findByPostAndUser(postId: string, userId: string): Promise<Reaction | null>;
  save(reaction: Reaction): Promise<Reaction>;
  deleteByPostAndUser(postId: string, userId: string): Promise<void>;
}
