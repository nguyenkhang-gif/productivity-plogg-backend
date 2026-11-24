import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from 'src/modules/social/category/domain/category.repository.interface';
import { Category } from 'src/modules/social/category/domain/category.entity';

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
}

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: CategoryRepository,
  ) {}

  async execute(id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.categoryRepo.update(id, input);
  }
}
