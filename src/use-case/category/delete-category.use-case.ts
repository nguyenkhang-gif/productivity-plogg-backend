import { Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY, CategoryRepository } from 'src/core/domain/repositories/category.repository.interface';
import { POST_REPOSITORY, PostRepository } from 'src/core/domain/repositories/post.repository.interface';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: CategoryRepository,
    @Inject(POST_REPOSITORY) private readonly postRepo: PostRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.postRepo.nullifyCategoryOnPosts(id);
    await this.categoryRepo.delete(id);
  }
}
