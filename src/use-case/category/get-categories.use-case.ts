import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from 'src/core/domain/repositories/category.repository.interface';
import { Category } from 'src/core/domain/entities/category.entity';

@Injectable()
export class GetCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: CategoryRepository,
  ) {}

  async execute(): Promise<Category[]> {
    return this.categoryRepo.findAll();
  }
}
