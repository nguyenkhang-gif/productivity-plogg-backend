export enum BudgetTransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class BudgetCategoryEntity {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  type: BudgetTransactionType;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
