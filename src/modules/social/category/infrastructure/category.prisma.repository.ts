import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category as CategoryRow } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { CategoryRepository } from 'src/modules/social/category/domain/category.repository.interface';
import { Category as CategoryEntity } from 'src/modules/social/category/domain/category.entity';
import {
  isRecordNotFound,
  isUniqueViolation,
} from 'src/modules/social/shared/prisma-errors';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: CategoryRow): CategoryEntity {
    return new CategoryEntity({
      id: row.id,
      name: row.name,
      slug: row.slug,
      postCount: row.postCount,
      createdAt: row.createdAt,
    });
  }

  async findAll(): Promise<CategoryEntity[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    return row ? this.mapToDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    const row = await this.prisma.category.findUnique({ where: { slug } });
    return row ? this.mapToDomain(row) : null;
  }

  async create(data: Partial<CategoryEntity>): Promise<CategoryEntity> {
    try {
      const row = await this.prisma.category.create({
        data: {
          id: newObjectId(),
          name: data.name as string,
          slug: data.slug as string,
          postCount: 0,
        },
      });
      return this.mapToDomain(row);
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException('Category slug already exists');
      throw err;
    }
  }

  async update(
    id: string,
    data: Partial<CategoryEntity>,
  ): Promise<CategoryEntity> {
    try {
      const row = await this.prisma.category.update({
        where: { id },
        data: { name: data.name, slug: data.slug },
      });
      return this.mapToDomain(row);
    } catch (err) {
      if (isRecordNotFound(err))
        throw new NotFoundException('Category not found');
      if (isUniqueViolation(err))
        throw new ConflictException('Category slug already exists');
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (err) {
      if (isRecordNotFound(err))
        throw new NotFoundException('Category not found');
      throw err;
    }
  }

  // updateMany: a missing id is a silent no-op, like the Mongo $inc.
  async incrementPostCount(id: string): Promise<void> {
    await this.prisma.category.updateMany({
      where: { id },
      data: { postCount: { increment: 1 } },
    });
  }

  async decrementPostCount(id: string): Promise<void> {
    await this.prisma.category.updateMany({
      where: { id, postCount: { gt: 0 } },
      data: { postCount: { decrement: 1 } },
    });
  }
}
