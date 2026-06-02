import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSLATION_CONTEXT_REPOSITORY,
  TranslationContextRepository,
} from 'src/core/domain/repositories/translation-context.repository.interface';
import { TranslationContext } from 'src/core/domain/entities/translation-context.entity';

@Injectable()
export class GetUserTranslationContextsUseCase {
  constructor(
    @Inject(TRANSLATION_CONTEXT_REPOSITORY)
    private readonly repo: TranslationContextRepository,
  ) {}

  async execute(userId: string): Promise<TranslationContext[]> {
    return this.repo.findByUserId(userId);
  }
}
