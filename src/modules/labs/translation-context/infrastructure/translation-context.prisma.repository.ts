import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import { TranslationContextRepository } from 'src/modules/labs/translation-context/domain/translation-context.repository.interface';
import { TranslationContext as TranslationContextEntity } from 'src/modules/labs/translation-context/domain/translation-context.entity';

type TranslationContextRow = Prisma.TranslationContextGetPayload<object>;

const json = (value: unknown) => value as Prisma.InputJsonValue | undefined;

@Injectable()
export class PrismaTranslationContextRepository
  implements TranslationContextRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: TranslationContextRow): TranslationContextEntity {
    return new TranslationContextEntity({
      id: row.id,
      userId: row.userId,
      title: row.title,
      genre: row.genre,
      setting: row.setting,
      targetTone: row.targetTone,
      sourceLanguage: row.sourceLanguage,
      targetLanguage: row.targetLanguage,
      characters:
        row.characters as unknown as TranslationContextEntity['characters'],
      glossary: row.glossary as unknown as TranslationContextEntity['glossary'],
      styleGuide:
        row.styleGuide as unknown as TranslationContextEntity['styleGuide'],
      chapterSummaries:
        row.chapterSummaries as unknown as TranslationContextEntity['chapterSummaries'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async create(
    context: TranslationContextEntity,
  ): Promise<TranslationContextEntity> {
    const row = await this.prisma.translationContext.create({
      data: {
        id: newObjectId(),
        userId: context.userId,
        title: context.title,
        genre: context.genre,
        setting: context.setting,
        targetTone: context.targetTone,
        sourceLanguage: context.sourceLanguage,
        targetLanguage: context.targetLanguage,
        characters: json(context.characters ?? []),
        glossary: json(context.glossary ?? []),
        styleGuide: json(context.styleGuide) as Prisma.InputJsonValue,
        chapterSummaries: json(context.chapterSummaries ?? []),
      },
    });
    return this.mapToDomain(row);
  }

  async findById(id: string): Promise<TranslationContextEntity | null> {
    const row = await this.prisma.translationContext.findUnique({
      where: { id },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<TranslationContextEntity[]> {
    const rows = await this.prisma.translationContext.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.mapToDomain(row));
  }

  async update(
    id: string,
    data: Partial<TranslationContextEntity>,
  ): Promise<TranslationContextEntity> {
    try {
      const row = await this.prisma.translationContext.update({
        where: { id },
        // Whitelist: ownership/identity columns can never be rewritten.
        data: {
          title: data.title,
          genre: data.genre,
          setting: data.setting,
          targetTone: data.targetTone,
          sourceLanguage: data.sourceLanguage,
          targetLanguage: data.targetLanguage,
          characters: json(data.characters),
          glossary: json(data.glossary),
          styleGuide: json(data.styleGuide),
          chapterSummaries: json(data.chapterSummaries),
        },
      });
      return this.mapToDomain(row);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('TranslationContext not found');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { count } = await this.prisma.translationContext.deleteMany({
      where: { id },
    });
    if (count === 0) {
      throw new NotFoundException('TranslationContext not found');
    }
  }
}
