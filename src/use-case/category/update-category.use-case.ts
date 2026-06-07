import { Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY, CategoryRepository } from 'src/core/domain/repositories/category.repository.interface';
import { Category } from 'src/core/domain/entities/category.entity';

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
}

@Injectable()
export class UpdateCategoryUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: CategoryRepository) {}

  async execute(id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.categoryRepo.update(id, input);
  }
}
