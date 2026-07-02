import { Inject, Injectable } from '@nestjs/common';
import {
  BUDGET_TRANSACTION_REPOSITORY,
  BudgetTransactionRepository,
} from 'src/core/domain/repositories/budget-transaction.repository.interface';
import { CreateBudgetTransactionDto } from 'src/core/dtos/create-budget-transaction.dto';
import { BudgetTransactionEntity } from 'src/core/domain/entities/budget-transaction.entity';

@Injectable()
export class CreateBudgetTransactionUseCase {
  constructor(
    @Inject(BUDGET_TRANSACTION_REPOSITORY)
    private readonly repo: BudgetTransactionRepository,
  ) {}

  execute(
    userId: string,
    dto: CreateBudgetTransactionDto,
  ): Promise<BudgetTransactionEntity> {
    return this.repo.create(userId, dto);
  }
}
