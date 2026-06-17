import { Module } from '@nestjs/common';
import { PrismaService } from '../databases/prisma/prisma.service';
import { BUDGET_CATEGORY_REPOSITORY } from 'src/core/domain/repositories/budget-category.repository.interface';
import { BUDGET_TRANSACTION_REPOSITORY } from 'src/core/domain/repositories/budget-transaction.repository.interface';
import { PgBudgetCategoryRepository } from '../databases/pg/repositories/budget-category.pg.repository';
import { PgBudgetTransactionRepository } from '../databases/pg/repositories/budget-transaction.pg.repository';
import { ListBudgetCategoriesUseCase } from 'src/use-case/budget-category/list-budget-categories.use-case';
import { CreateBudgetCategoryUseCase } from 'src/use-case/budget-category/create-budget-category.use-case';
import { UpdateBudgetCategoryUseCase } from 'src/use-case/budget-category/update-budget-category.use-case';
import { ArchiveBudgetCategoryUseCase } from 'src/use-case/budget-category/archive-budget-category.use-case';
import { ListBudgetTransactionsUseCase } from 'src/use-case/budget-transaction/list-budget-transactions.use-case';
import { GetBudgetTransactionUseCase } from 'src/use-case/budget-transaction/get-budget-transaction.use-case';
import { CreateBudgetTransactionUseCase } from 'src/use-case/budget-transaction/create-budget-transaction.use-case';
import { UpdateBudgetTransactionUseCase } from 'src/use-case/budget-transaction/update-budget-transaction.use-case';
import { DeleteBudgetTransactionUseCase } from 'src/use-case/budget-transaction/delete-budget-transaction.use-case';
import { BudgetCategoryController } from 'src/presentation/controllers/budget-category.controller';
import { BudgetTransactionController } from 'src/presentation/controllers/budget-transaction.controller';

@Module({
  controllers: [BudgetCategoryController, BudgetTransactionController],
  providers: [
    PrismaService,
    { provide: BUDGET_CATEGORY_REPOSITORY, useClass: PgBudgetCategoryRepository },
    { provide: BUDGET_TRANSACTION_REPOSITORY, useClass: PgBudgetTransactionRepository },
    ListBudgetCategoriesUseCase,
    CreateBudgetCategoryUseCase,
    UpdateBudgetCategoryUseCase,
    ArchiveBudgetCategoryUseCase,
    ListBudgetTransactionsUseCase,
    GetBudgetTransactionUseCase,
    CreateBudgetTransactionUseCase,
    UpdateBudgetTransactionUseCase,
    DeleteBudgetTransactionUseCase,
  ],
})
export class BudgetModule {}
