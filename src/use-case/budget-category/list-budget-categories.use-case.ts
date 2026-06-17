import { Inject, Injectable } from '@nestjs/common';
import {
  BUDGET_CATEGORY_REPOSITORY,
  BudgetCategoryRepository,
} from 'src/core/domain/repositories/budget-category.repository.interface';
import { BudgetCategoryEntity } from 'src/core/domain/entities/budget-category.entity';

@Injectable()
export class ListBudgetCategoriesUseCase {
  constructor(
    @Inject(BUDGET_CATEGORY_REPOSITORY)
    private readonly repo: BudgetCategoryRepository,
  ) {}

  execute(includeArchived = false): Promise<BudgetCategoryEntity[]> {
    return this.repo.findAll(includeArchived);
  }
}
