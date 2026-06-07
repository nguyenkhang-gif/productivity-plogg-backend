import { Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY, CategoryRepository } from 'src/core/domain/repositories/category.repository.interface';
import { Category } from 'src/core/domain/entities/category.entity';

export interface CreateCategoryInput {
  name: string;
  slug: string;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: CategoryRepository) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    return this.categoryRepo.create(input);
  }
}