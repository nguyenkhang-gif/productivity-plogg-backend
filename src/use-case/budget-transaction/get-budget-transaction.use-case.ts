import { Inject, Injectable } from '@nestjs/common';
import {
  BUDGET_TRANSACTION_REPOSITORY,
  BudgetTransactionRepository,
} from 'src/core/domain/repositories/budget-transaction.repository.interface';
import { BudgetTransactionEntity } from 'src/core/domain/entities/budget-transaction.entity';

@Injectable()
export class GetBudgetTransactionUseCase {
  constructor(
    @Inject(BUDGET_TRANSACTION_REPOSITORY)
    private readonly repo: BudgetTransactionRepository,
  ) {}

  execute(id: string, userId: string): Promise<BudgetTransactionEntity> {
    return this.repo.findById(id, userId);
  }
}
