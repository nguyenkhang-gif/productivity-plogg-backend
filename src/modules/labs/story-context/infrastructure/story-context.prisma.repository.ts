import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { newObjectId } from 'src/shared/database/object-id';
import {
  PaginatedStoryContexts,
  StoryContextRepository,
} from 'src/modules/labs/story-context/domain/story-context.repository.interface';
import { StoryContext as StoryContextEntity } from 'src/modules/labs/story-context/domain/story-context.entity';

type StoryContextRow = Prisma.StoryContextGetPayload<object>;

const json = (value: unknown) => value as Prisma.InputJsonValue | undefined;

@Injectable()
export class PrismaStoryContextRepository implements StoryContextRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: StoryContextRow): StoryContextEntity {
    return new StoryContextEntity({
      id: row.id,
      userId: row.userId,
      title: row.title,
      author: row.author,
      genre: row.genre,
      setting: row.setting,
      targetTone: row.targetTone,
      sourceLanguage: row.sourceLanguage,
      targetLanguage: row.targetLanguage,
      characters: row.characters as unknown as StoryContextEntity['characters'],
      glossary: row.glossary as unknown as StoryContextEntity['glossary'],
      styleGuide: row.styleGuide as unknown as StoryContextEntity['styleGuide'],
      chapterSummaries:
        row.chapterSummaries as unknown as StoryContextEntity['chapterSummaries'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async create(context: StoryContextEntity): Promise<StoryContextEntity> {
    const row = await this.prisma.storyContext.create({
      data: {
        id: newObjectId(),
        userId: context.userId,
        title: context.title,
        author: context.author,
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

  async findById(id: string): Promise<StoryContextEntity | null> {
    const row = await this.prisma.storyContext.findUnique({ where: { id } });
    return row ? this.mapToDomain(row) : null;
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedStoryContexts> {
    const [rows, total] = await Promise.all([
      this.prisma.storyContext.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.storyContext.count({ where: { userId } }),
    ]);
    return {
      data: rows.map((row) => this.mapToDomain(row)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(
    id: string,
    data: Partial<StoryContextEntity>,
  ): Promise<StoryContextEntity> {
    try {
      const row = await this.prisma.storyContext.update({
        where: { id },
        // Whitelist: ownership/identity columns can never be rewritten.
        data: {
          title: data.title,
          author: data.author,
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
        throw new NotFoundException('StoryContext not found');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { count } = await this.prisma.storyContext.deleteMany({
      where: { id },
    });
    if (count === 0) throw new NotFoundException('StoryContext not found');
  }
}
