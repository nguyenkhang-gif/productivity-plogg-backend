import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { CollectionMigrator } from '../migrator';
import { nonEmptyString, timestamps, toCount, toHexId } from './social-util';

export type CategoryRow = Prisma.CategoryUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};
export type TagRow = Prisma.TagUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Categories and tags share one shape: { name, slug (unique), postCount }. */
function transformTaxonomy(doc: Record<string, any>): TagRow | null {
  const id = toHexId(doc._id);
  const name = nonEmptyString(doc.name);
  const slug = nonEmptyString(doc.slug);
  if (!id || !name || !slug) return null;
  return {
    id,
    name,
    slug,
    // the denormalised counter is carried over as stored
    postCount: toCount(doc.postCount),
    ...timestamps(doc, id),
  };
}

export const transformCategory = (
  doc: Record<string, any>,
): CategoryRow | null => transformTaxonomy(doc);
export const transformTag = (doc: Record<string, any>): TagRow | null =>
  transformTaxonomy(doc);

export const categoriesMigrator: CollectionMigrator<
  Record<string, any>,
  CategoryRow
> = {
  name: 'categories',
  collection: 'categories',
  dependsOn: [],
  transform: transformCategory,
  async upsertBatch(prisma: PrismaClient, rows: CategoryRow[]) {
    await prisma.$transaction(
      rows.map((row) => {
        const { id, ...data } = row;
        return prisma.category.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }),
    );
  },
  countTarget: (prisma) => prisma.category.count(),
};

export const tagsMigrator: CollectionMigrator<Record<string, any>, TagRow> = {
  name: 'tags',
  collection: 'tags',
  dependsOn: [],
  transform: transformTag,
  async upsertBatch(prisma: PrismaClient, rows: TagRow[]) {
    await prisma.$transaction(
      rows.map((row) => {
        const { id, ...data } = row;
        return prisma.tag.upsert({ where: { id }, create: row, update: data });
      }),
    );
  },
  countTarget: (prisma) => prisma.tag.count(),
};
