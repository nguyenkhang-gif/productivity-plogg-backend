import { Inject, Injectable } from '@nestjs/common';
import {
  BUDGET_TRANSACTION_REPOSITORY,
  BudgetTransactionRepository,
} from 'src/core/domain/repositories/budget-transaction.repository.interface';
import { UpdateBudgetTransactionDto } from 'src/core/dtos/update-budget-transaction.dto';
import { BudgetTransactionEntity } from 'src/core/domain/entities/budget-transaction.entity';

@Injectable()
export class UpdateBudgetTransactionUseCase {
  constructor(
    @Inject(BUDGET_TRANSACTION_REPOSITORY)
    private readonly repo: BudgetTransactionRepository,
  ) {}

  execute(id: string, userId: string, dto: UpdateBudgetTransactionDto): Promise<BudgetTransactionEntity> {
    return this.repo.update(id, userId, dto);
  }
}
