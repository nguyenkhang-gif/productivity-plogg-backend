import { StoryContext } from '../entities/story-context.entity';

export const STORY_CONTEXT_REPOSITORY = 'STORY_CONTEXT_REPOSITORY';

export interface PaginatedStoryContexts {
  data: StoryContext[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StoryContextRepository {
  create(context: StoryContext): Promise<StoryContext>;
  findById(id: string): Promise<StoryContext | null>;
  findByUserId(userId: string, page: number, limit: number): Promise<PaginatedStoryContexts>;
  update(id: string, data: Partial<StoryContext>): Promise<StoryContext>;
  delete(id: string): Promise<void>;
}
