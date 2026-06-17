import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BudgetTransactionType } from '../domain/entities/budget-category.entity';

export class CreateBudgetCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsEnum(BudgetTransactionType)
  type: BudgetTransactionType;
}
