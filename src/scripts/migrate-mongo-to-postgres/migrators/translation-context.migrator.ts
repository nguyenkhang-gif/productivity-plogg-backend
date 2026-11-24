import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { CollectionMigrator } from '../migrator';
import {
  assertOwnersExist,
  isPlainObject,
  optionalText,
  text,
  timestamps,
  toHexId,
  toJson,
  toJsonArray,
} from './labs-common';

export type TranslationContextRow =
  Prisma.TranslationContextUncheckedCreateInput & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  };

/**
 * Nested characters/glossary/styleGuide/chapterSummaries are copied as JSON
 * (non-array lists become `[]`). Documents without a usable _id/userId or
 * without a styleGuide object are skipped.
 */
export function transformTranslationContext(
  doc: Record<string, any>,
): TranslationContextRow | null {
  const id = toHexId(doc._id);
  const userId = toHexId(doc.userId);
  if (!id || !userId || !isPlainObject(doc.styleGuide)) return null;

  return {
    id,
    userId,
    title: text(doc.title),
    genre: text(doc.genre),
    setting: text(doc.setting),
    targetTone: text(doc.targetTone),
    sourceLanguage: optionalText(doc.sourceLanguage) ?? 'en',
    targetLanguage: optionalText(doc.targetLanguage) ?? 'vi',
    characters: toJsonArray(doc.characters),
    glossary: toJsonArray(doc.glossary),
    styleGuide: toJson(doc.styleGuide),
    chapterSummaries: toJsonArray(doc.chapterSummaries),
    ...timestamps(doc, id),
  };
}

export const translationContextMigrator: CollectionMigrator<
  Record<string, any>,
  TranslationContextRow
> = {
  name: 'translation-contexts',
  collection: 'translationcontexts',
  dependsOn: ['users'],
  transform: transformTranslationContext,
  async upsertBatch(prisma: PrismaClient, rows: TranslationContextRow[]) {
    await assertOwnersExist(
      prisma,
      'translation-contexts',
      rows.map((r) => ({ id: r.id, owner: r.userId })),
    );
    await prisma.$transaction(
      rows.map((row) => {
        const { id, ...data } = row;
        return prisma.translationContext.upsert({
          where: { id },
          create: row,
          update: data,
        });
      }),
    );
  },
  countTarget: (prisma) => prisma.translationContext.count(),
};
