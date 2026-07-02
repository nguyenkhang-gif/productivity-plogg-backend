import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaginatedStoryContexts,
  StoryContextRepository,
} from 'src/core/domain/repositories/story-context.repository.interface';
import { StoryContext as StoryContextEntity } from 'src/core/domain/entities/story-context.entity';
import {
  StoryContext,
  StoryContextDocument,
} from '../schemas/story-context.schema';

@Injectable()
export class MongoStoryContextRepository implements StoryContextRepository {
  constructor(
    @InjectModel(StoryContext.name)
    private readonly model: Model<StoryContextDocument>,
  ) {}

  private mapToDomain(doc: StoryContextDocument): StoryContextEntity {
    return new StoryContextEntity({
      id: doc._id.toString(),
      userId: doc.userId,
      title: doc.title,
      author: doc.author,
      genre: doc.genre,
      setting: doc.setting,
      targetTone: doc.targetTone,
      sourceLanguage: doc.sourceLanguage,
      targetLanguage: doc.targetLanguage,
      characters: doc.characters,
      glossary: doc.glossary,
      styleGuide: doc.styleGuide,
      chapterSummaries: doc.chapterSummaries,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    });
  }

  async create(context: StoryContextEntity): Promise<StoryContextEntity> {
    const created = new this.model({
      userId: context.userId,
      title: context.title,
      author: context.author,
      genre: context.genre,
      setting: context.setting,
      targetTone: context.targetTone,
      sourceLanguage: context.sourceLanguage,
      targetLanguage: context.targetLanguage,
      characters: context.characters ?? [],
      glossary: context.glossary ?? [],
      styleGuide: context.styleGuide,
      chapterSummaries: context.chapterSummaries ?? [],
    });
    const saved = await created.save();
    return this.mapToDomain(saved);
  }

  async findById(id: string): Promise<StoryContextEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedStoryContexts> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments({ userId }).exec(),
    ]);
    return {
      data: docs.map((doc) => this.mapToDomain(doc)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(
    id: string,
    data: Partial<StoryContextEntity>,
  ): Promise<StoryContextEntity> {
    const updated = await this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('StoryContext not found');
    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('StoryContext not found');
  }
}
