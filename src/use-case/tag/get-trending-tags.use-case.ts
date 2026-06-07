import { Inject, Injectable } from '@nestjs/common';
import { TAG_REPOSITORY, TagRepository } from 'src/core/domain/repositories/tag.repository.interface';
import { Tag } from 'src/core/domain/entities/tag.entity';

@Injectable()
export class GetTrendingTagsUseCase {
  constructor(@Inject(TAG_REPOSITORY) private readonly tagRepo: TagRepository) {}

  async execute(limit: number): Promise<Tag[]> {
    return this.tagRepo.findTrending(limit);
  }
}
