import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BudgetTransactionRepository,
  ListTransactionFilter,
  PaginatedTransactions,
} from 'src/core/domain/repositories/budget-transaction.repository.interface';
import { BudgetTransactionEntity } from 'src/core/domain/entities/budget-transaction.entity';
import { BudgetTransactionType } from 'src/core/domain/entities/budget-category.entity';
import { CreateBudgetTransactionDto } from 'src/core/dtos/create-budget-transaction.dto';
import { UpdateBudgetTransactionDto } from 'src/core/dtos/update-budget-transaction.dto';

@Injectable()
export class PgBudgetTransactionRepository implements BudgetTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): BudgetTransactionEntity {
    return {
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      type: row.type as BudgetTransactionType,
      amount: Number(row.amount),
      currency: row.currency,
      amountInBaseCurrency: Number(row.amountInBaseCurrency),
      exchangeRateUsed: Number(row.exchangeRateUsed ?? 1),
      date: row.date,
      note: row.note ?? undefined,
      isRecurring: row.isRecurring,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      category: row.category ?? undefined,
    };
  }

  async findAll(userId: string, filter: ListTransactionFilter): Promise<PaginatedTransactions> {
    const skip = (filter.page - 1) * filter.limit;
    const where = {
      userId,
      isDeleted: false,
      ...(filter.type && { type: filter.type }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
      ...(filter.startDate || filter.endDate
        ? {
            date: {
              ...(filter.startDate && { gte: filter.startDate }),
              ...(filter.endDate && { lte: filter.endDate }),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.budgetTransaction.count({ where }),
      this.prisma.budgetTransaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: filter.limit,
      }),
    ]);

    return {
      items: rows.map((r) => this.map(r)),
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  async findById(id: string, userId: string): Promise<BudgetTransactionEntity> {
    const row = await this.prisma.budgetTransaction.findFirstOrThrow({
      where: { id, userId, isDeleted: false },
      include: { category: true },
    });
    return this.map(row);
  }

  async create(userId: string, data: CreateBudgetTransactionDto): Promise<BudgetTransactionEntity> {
    const currency = data.currency ?? 'VND';
    const exchangeRateUsed = 1;
    const amountInBaseCurrency = data.amount * exchangeRateUsed;

    const row = await this.prisma.budgetTransaction.create({
      data: {
        userId,
        categoryId: data.categoryId,
        type: data.type,
        amount: data.amount,
        currency,
        amountInBaseCurrency,
        exchangeRateUsed,
        date: new Date(data.date),
        note: data.note,
      },
      include: { category: true },
    });
    return this.map(row);
  }

  async update(id: string, userId: string, data: UpdateBudgetTransactionDto): Promise<BudgetTransactionEntity> {
    const existing = await this.prisma.budgetTransaction.findFirstOrThrow({
      where: { id, userId },
    });

    const amount = data.amount ?? Number(existing.amount);
    const currency = data.currency ?? existing.currency;
    const exchangeRateUsed = Number(existing.exchangeRateUsed ?? 1);
    const amountInBaseCurrency = amount * exchangeRateUsed;

    const row = await this.prisma.budgetTransaction.update({
      where: { id },
      data: {
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.note !== undefined && { note: data.note }),
        amount,
        currency,
        amountInBaseCurrency,
        exchangeRateUsed,
      },
      include: { category: true },
    });
    return this.map(row);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.prisma.budgetTransaction.findFirstOrThrow({ where: { id, userId } });
    await this.prisma.budgetTransaction.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
