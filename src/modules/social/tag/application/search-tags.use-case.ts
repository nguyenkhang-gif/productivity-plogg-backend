import { Inject, Injectable } from '@nestjs/common';
import {
  TAG_REPOSITORY,
  TagRepository,
} from 'src/modules/social/tag/domain/tag.repository.interface';
import { Tag } from 'src/modules/social/tag/domain/tag.entity';

@Injectable()
export class SearchTagsUseCase {
  constructor(
    @Inject(TAG_REPOSITORY) private readonly tagRepo: TagRepository,
  ) {}

  async execute(search: string, limit: number): Promise<Tag[]> {
    return this.tagRepo.findBySlugSearch(search, limit);
  }
}
