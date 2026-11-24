/*
  Warnings:

  - You are about to drop the `budget_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `budget_transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "budget_transactions" DROP CONSTRAINT "budget_transactions_categoryId_fkey";

-- DropTable
DROP TABLE "budget_categories";

-- DropTable
DROP TABLE "budget_transactions";

-- DropEnum
DROP TYPE "BudgetTransactionType";
