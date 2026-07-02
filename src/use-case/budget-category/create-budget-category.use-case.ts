import { Inject, Injectable } from '@nestjs/common';
import {
  BUDGET_CATEGORY_REPOSITORY,
  BudgetCategoryRepository,
} from 'src/core/domain/repositories/budget-category.repository.interface';
import { CreateBudgetCategoryDto } from 'src/core/dtos/create-budget-category.dto';
import { BudgetCategoryEntity } from 'src/core/domain/entities/budget-category.entity';

@Injectable()
export class CreateBudgetCategoryUseCase {
  constructor(
    @Inject(BUDGET_CATEGORY_REPOSITORY)
    private readonly repo: BudgetCategoryRepository,
  ) {}

  execute(
    userId: string,
    dto: CreateBudgetCategoryDto,
  ): Promise<BudgetCategoryEntity> {
    return this.repo.create(userId, dto);
  }
}
