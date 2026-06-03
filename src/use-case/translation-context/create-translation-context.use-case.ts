import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSLATION_CONTEXT_REPOSITORY,
  TranslationContextRepository,
} from 'src/core/domain/repositories/translation-context.repository.interface';
import { TranslationContext } from 'src/core/domain/entities/translation-context.entity';
import { CreateTranslationContextDto } from 'src/core/dtos/translation-context.dto';

@Injectable()
export class CreateTranslationContextUseCase {
  constructor(
    @Inject(TRANSLATION_CONTEXT_REPOSITORY)
    private readonly repo: TranslationContextRepository,
  ) {}

  async execute(userId: string, dto: CreateTranslationContextDto): Promise<TranslationContext> {
    const context = new TranslationContext({
      userId,
      title: dto.title,
      genre: dto.genre,
      setting: dto.setting,
      targetTone: dto.targetTone,
      sourceLanguage: dto.sourceLanguage ?? 'en',
      targetLanguage: dto.targetLanguage ?? 'vi',
      characters: dto.characters ?? [],
      glossary: dto.glossary ?? [],
      styleGuide: dto.styleGuide,
      chapterSummaries: dto.chapterSummaries ?? [],
    });
    return this.repo.create(context);
  }
}
