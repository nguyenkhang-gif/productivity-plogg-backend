import { Inject, Injectable } from '@nestjs/common';
import {
  BUDGET_CATEGORY_REPOSITORY,
  BudgetCategoryRepository,
} from 'src/core/domain/repositories/budget-category.repository.interface';

@Injectable()
export class ArchiveBudgetCategoryUseCase {
  constructor(
    @Inject(BUDGET_CATEGORY_REPOSITORY)
    private readonly repo: BudgetCategoryRepository,
  ) {}

  execute(id: string, userId: string): Promise<void> {
    return this.repo.archive(id, userId);
  }
}
