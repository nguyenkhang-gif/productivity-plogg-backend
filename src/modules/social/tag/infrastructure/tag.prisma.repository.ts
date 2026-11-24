import { Injectable } from '@nestjs/common';
import { Tag as TagRow } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { escapeLike } from 'src/shared/database/like';
import { isUniqueViolation } from 'src/modules/social/shared/prisma-errors';
import { TagRepository } from 'src/modules/social/tag/domain/tag.repository.interface';
import { Tag as TagEntity } from 'src/modules/social/tag/domain/tag.entity';

@Injectable()
export class PrismaTagRepository implements TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: TagRow): TagEntity {
    return new TagEntity({
      id: row.id,
      name: row.name,
      slug: row.slug,
      postCount: row.postCount,
      createdAt: row.createdAt,
    });
  }

  /** $setOnInsert semantics: an existing slug keeps its original name. */
  async findOrCreate(name: string, slug: string): Promise<TagEntity> {
    try {
      const row = await this.prisma.tag.upsert({
        where: { slug },
        create: { id: newObjectId(), name, slug, postCount: 0 },
        update: {},
      });
      return this.mapToDomain(row);
    } catch (err) {
      // Two requests creating the same new tag at once: the loser re-reads.
      if (!isUniqueViolation(err)) throw err;
      const row = await this.prisma.tag.findUniqueOrThrow({ where: { slug } });
      return this.mapToDomain(row);
    }
  }

  async findBySlugSearch(search: string, limit: number): Promise<TagEntity[]> {
    const rows = await this.prisma.tag.findMany({
      where: {
        slug: {
          contains: escapeLike(search.toLowerCase()),
          mode: 'insensitive',
        },
      },
      orderBy: [{ postCount: 'desc' }, { id: 'asc' }],
      take: limit,
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async findTrending(limit: number): Promise<TagEntity[]> {
    const rows = await this.prisma.tag.findMany({
      where: { postCount: { gt: 0 } },
      orderBy: [{ postCount: 'desc' }, { id: 'asc' }],
      take: limit,
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async findByIds(ids: string[]): Promise<TagEntity[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.tag.findMany({
      where: { id: { in: ids } },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async incrementPostCount(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.prisma.tag.updateMany({
      where: { id: { in: ids } },
      data: { postCount: { increment: 1 } },
    });
  }

  async decrementPostCount(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.prisma.tag.updateMany({
      where: { id: { in: ids }, postCount: { gt: 0 } },
      data: { postCount: { decrement: 1 } },
    });
  }
}
