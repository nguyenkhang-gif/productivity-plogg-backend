import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TranslationContextRepository } from 'src/core/domain/repositories/translation-context.repository.interface';
import { TranslationContext as TranslationContextEntity } from 'src/core/domain/entities/translation-context.entity';
import {
  TranslationContext,
  TranslationContextDocument,
} from '../schemas/translation-context.schema';

@Injectable()
export class MongoTranslationContextRepository
  implements TranslationContextRepository
{
  constructor(
    @InjectModel(TranslationContext.name)
    private readonly model: Model<TranslationContextDocument>,
  ) {}

  private mapToDomain(
    doc: TranslationContextDocument,
  ): TranslationContextEntity {
    return new TranslationContextEntity({
      id: doc._id.toString(),
      userId: doc.userId,
      title: doc.title,
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

  async create(
    context: TranslationContextEntity,
  ): Promise<TranslationContextEntity> {
    const created = new this.model({
      userId: context.userId,
      title: context.title,
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

  async findById(id: string): Promise<TranslationContextEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByUserId(userId: string): Promise<TranslationContextEntity[]> {
    const docs = await this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.mapToDomain(doc));
  }

  async update(
    id: string,
    data: Partial<TranslationContextEntity>,
  ): Promise<TranslationContextEntity> {
    const updated = await this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('TranslationContext not found');
    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('TranslationContext not found');
  }
}
