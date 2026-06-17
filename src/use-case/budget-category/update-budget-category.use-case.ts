import { Inject, Injectable } from '@nestjs/common';
import {
  BUDGET_CATEGORY_REPOSITORY,
  BudgetCategoryRepository,
} from 'src/core/domain/repositories/budget-category.repository.interface';
import { UpdateBudgetCategoryDto } from 'src/core/dtos/update-budget-category.dto';

@Injectable()
export class UpdateBudgetCategoryUseCase {
  constructor(
    @Inject(BUDGET_CATEGORY_REPOSITORY)
    private readonly repo: BudgetCategoryRepository,
  ) {}

  execute(id: string, userId: string, dto: UpdateBudgetCategoryDto): Promise<void> {
    return this.repo.update(id, userId, dto);
  }
}
