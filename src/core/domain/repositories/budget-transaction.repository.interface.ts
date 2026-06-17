import { BudgetTransactionEntity } from '../entities/budget-transaction.entity';
import { BudgetTransactionType } from '../entities/budget-category.entity';
import { CreateBudgetTransactionDto } from '../../dtos/create-budget-transaction.dto';
import { UpdateBudgetTransactionDto } from '../../dtos/update-budget-transaction.dto';

export const BUDGET_TRANSACTION_REPOSITORY = 'BUDGET_TRANSACTION_REPOSITORY';

export interface ListTransactionFilter {
  startDate?: Date;
  endDate?: Date;
  type?: BudgetTransactionType;
  categoryId?: string;
  page: number;
  limit: number;
}

export interface PaginatedTransactions {
  items: BudgetTransactionEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BudgetTransactionRepository {
  findAll(userId: string, filter: ListTransactionFilter): Promise<PaginatedTransactions>;
  findById(id: string, userId: string): Promise<BudgetTransactionEntity>;
  create(userId: string, data: CreateBudgetTransactionDto): Promise<BudgetTransactionEntity>;
  update(id: string, userId: string, data: UpdateBudgetTransactionDto): Promise<BudgetTransactionEntity>;
  softDelete(id: string, userId: string): Promise<void>;
}
