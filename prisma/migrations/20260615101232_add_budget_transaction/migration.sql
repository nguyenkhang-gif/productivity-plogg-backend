-- CreateTable
CREATE TABLE "budget_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "BudgetTransactionType" NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "amountInBaseCurrency" DECIMAL(18,6) NOT NULL,
    "exchangeRateUsed" DECIMAL(18,8),
    "date" DATE NOT NULL,
    "note" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budget_transactions_userId_date_idx" ON "budget_transactions"("userId", "date");

-- CreateIndex
CREATE INDEX "budget_transactions_userId_categoryId_idx" ON "budget_transactions"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "budget_transactions_userId_type_date_idx" ON "budget_transactions"("userId", "type", "date");

-- AddForeignKey
ALTER TABLE "budget_transactions" ADD CONSTRAINT "budget_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "budget_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
