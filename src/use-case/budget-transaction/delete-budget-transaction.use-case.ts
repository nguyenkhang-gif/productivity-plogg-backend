import { Inject, Injectable } from '@nestjs/common';
import {
  BUDGET_TRANSACTION_REPOSITORY,
  BudgetTransactionRepository,
} from 'src/core/domain/repositories/budget-transaction.repository.interface';

@Injectable()
export class DeleteBudgetTransactionUseCase {
  constructor(
    @Inject(BUDGET_TRANSACTION_REPOSITORY)
    private readonly repo: BudgetTransactionRepository,
  ) {}

  execute(id: string, userId: string): Promise<void> {
    return this.repo.softDelete(id, userId);
  }
}
