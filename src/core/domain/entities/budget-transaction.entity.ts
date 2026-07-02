import {
  BudgetCategoryEntity,
  BudgetTransactionType,
} from './budget-category.entity';

export class BudgetTransactionEntity {
  id: string;
  userId: string;
  categoryId: string;
  type: BudgetTransactionType;
  amount: number;
  currency: string;
  amountInBaseCurrency: number;
  exchangeRateUsed: number;
  date: Date;
  note?: string;
  isRecurring: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: BudgetCategoryEntity;
}
