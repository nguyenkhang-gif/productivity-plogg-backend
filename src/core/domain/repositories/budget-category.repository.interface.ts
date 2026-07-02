import { BudgetCategoryEntity } from '../entities/budget-category.entity';
import { CreateBudgetCategoryDto } from '../../dtos/create-budget-category.dto';
import { UpdateBudgetCategoryDto } from '../../dtos/update-budget-category.dto';

export const BUDGET_CATEGORY_REPOSITORY = 'BUDGET_CATEGORY_REPOSITORY';

export interface BudgetCategoryRepository {
  findAll(includeArchived?: boolean): Promise<BudgetCategoryEntity[]>;
  findById(id: string): Promise<BudgetCategoryEntity>;
  create(
    userId: string,
    data: CreateBudgetCategoryDto,
  ): Promise<BudgetCategoryEntity>;
  update(
    id: string,
    userId: string,
    data: UpdateBudgetCategoryDto,
  ): Promise<void>;
  archive(id: string, userId: string): Promise<void>;
}
