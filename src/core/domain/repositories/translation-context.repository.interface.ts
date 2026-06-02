import { TranslationContext } from '../entities/translation-context.entity';

export const TRANSLATION_CONTEXT_REPOSITORY = 'TRANSLATION_CONTEXT_REPOSITORY';

export interface TranslationContextRepository {
  create(context: TranslationContext): Promise<TranslationContext>;
  findById(id: string): Promise<TranslationContext | null>;
  findByUserId(userId: string): Promise<TranslationContext[]>;
  update(id: string, data: Partial<TranslationContext>): Promise<TranslationContext>;
  delete(id: string): Promise<void>;
}
