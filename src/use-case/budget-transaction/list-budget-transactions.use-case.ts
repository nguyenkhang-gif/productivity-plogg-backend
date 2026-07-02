import { Inject, Injectable } from '@nestjs/common';
import {
  BUDGET_TRANSACTION_REPOSITORY,
  BudgetTransactionRepository,
  ListTransactionFilter,
  PaginatedTransactions,
} from 'src/core/domain/repositories/budget-transaction.repository.interface';
import { BudgetTransactionType } from 'src/core/domain/entities/budget-category.entity';

export interface ListTransactionQuery {
  startDate?: string;
  endDate?: string;
  type?: BudgetTransactionType;
  categoryId?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class ListBudgetTransactionsUseCase {
  constructor(
    @Inject(BUDGET_TRANSACTION_REPOSITORY)
    private readonly repo: BudgetTransactionRepository,
  ) {}

  execute(
    userId: string,
    query: ListTransactionQuery,
  ): Promise<PaginatedTransactions> {
    const filter: ListTransactionFilter = {
      page: parseInt(query.page ?? '1'),
      limit: parseInt(query.limit ?? '20'),
      type: query.type,
      categoryId: query.categoryId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
    return this.repo.findAll(userId, filter);
  }
}
