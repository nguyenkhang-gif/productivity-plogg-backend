import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSLATION_CONTEXT_REPOSITORY,
  TranslationContextRepository,
} from 'src/modules/labs/translation-context/domain/translation-context.repository.interface';
import { TranslationContext } from 'src/modules/labs/translation-context/domain/translation-context.entity';

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
