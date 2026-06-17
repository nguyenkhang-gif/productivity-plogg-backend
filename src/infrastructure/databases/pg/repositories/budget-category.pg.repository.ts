import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BudgetCategoryRepository } from 'src/core/domain/repositories/budget-category.repository.interface';
import { BudgetCategoryEntity, BudgetTransactionType } from 'src/core/domain/entities/budget-category.entity';
import { CreateBudgetCategoryDto } from 'src/core/dtos/create-budget-category.dto';
import { UpdateBudgetCategoryDto } from 'src/core/dtos/update-budget-category.dto';

@Injectable()
export class PgBudgetCategoryRepository implements BudgetCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): BudgetCategoryEntity {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      icon: row.icon,
      color: row.color,
      type: row.type as BudgetTransactionType,
      isArchived: row.isArchived,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(includeArchived = false): Promise<BudgetCategoryEntity[]> {
    const rows = await this.prisma.budgetCategory.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<BudgetCategoryEntity> {
    const row = await this.prisma.budgetCategory.findFirstOrThrow({ where: { id } });
    return this.map(row);
  }

  async create(userId: string, data: CreateBudgetCategoryDto): Promise<BudgetCategoryEntity> {
    const row = await this.prisma.budgetCategory.create({
      data: {
        userId,
        name: data.name,
        icon: data.icon ?? '💰',
        color: data.color ?? '#6366f1',
        type: data.type,
      },
    });
    return this.map(row);
  }

  async update(id: string, userId: string, data: UpdateBudgetCategoryDto): Promise<void> {
    await this.prisma.budgetCategory.updateMany({
      where: { id, userId },
      data,
    });
  }

  async archive(id: string, userId: string): Promise<void> {
    await this.prisma.budgetCategory.updateMany({
      where: { id, userId },
      data: { isArchived: true },
    });
  }
}
