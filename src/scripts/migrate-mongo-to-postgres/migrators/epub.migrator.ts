import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { CollectionMigrator } from '../migrator';
import {
  assertOwnersExist,
  isPlainObject,
  optionalText,
  timestamps,
  toHexId,
  toJson,
} from './labs-common';

export type EpubRow = Prisma.EpubUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * `properties` is copied as JSON (a missing/non-object value becomes `{}`).
 * Documents without a usable _id or createdUserId are skipped; owners that do
 * not exist in Postgres are rejected at write time (see assertOwnersExist).
 */
export function transformEpub(doc: Record<string, any>): EpubRow | null {
  const id = toHexId(doc._id);
  const createdUserId = toHexId(doc.createdUserId);
  if (!id || !createdUserId) return null;

  return {
    id,
    createdUserId,
    sampleUrl: optionalText(doc.sampleUrl),
    properties: isPlainObject(doc.properties) ? toJson(doc.properties) : {},
    ...timestamps(doc, id),
  };
}

export const epubMigrator: CollectionMigrator<Record<string, any>, EpubRow> = {
  name: 'epubs',
  collection: 'epubs',
  dependsOn: ['users'],
  transform: transformEpub,
  async upsertBatch(prisma: PrismaClient, rows: EpubRow[]) {
    await assertOwnersExist(
      prisma,
      'epubs',
      rows.map((r) => ({ id: r.id, owner: r.createdUserId })),
    );
    await prisma.$transaction(
      rows.map((row) => {
        const { id, ...data } = row;
        return prisma.epub.upsert({ where: { id }, create: row, update: data });
      }),
    );
  },
  countTarget: (prisma) => prisma.epub.count(),
};
