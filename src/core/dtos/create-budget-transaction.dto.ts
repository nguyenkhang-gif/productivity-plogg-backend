import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BudgetTransactionType } from '../domain/entities/budget-category.entity';

export class CreateBudgetTransactionDto {
  @IsString()
  categoryId: string;

  @IsEnum(BudgetTransactionType)
  type: BudgetTransactionType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  note?: string;
}
