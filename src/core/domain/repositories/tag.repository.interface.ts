import { Tag } from '../entities/tag.entity';

export const TAG_REPOSITORY = 'TAG_REPOSITORY';

export interface TagRepository {
  findOrCreate(name: string, slug: string): Promise<Tag>;
  findBySlugSearch(search: string, limit: number): Promise<Tag[]>;
  findTrending(limit: number): Promise<Tag[]>;
  findByIds(ids: string[]): Promise<Tag[]>;
  incrementPostCount(ids: string[]): Promise<void>;
  decrementPostCount(ids: string[]): Promise<void>;
}
