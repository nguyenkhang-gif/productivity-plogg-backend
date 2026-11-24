import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  TRANSLATION_CONTEXT_REPOSITORY,
  TranslationContextRepository,
} from 'src/modules/labs/translation-context/domain/translation-context.repository.interface';
import { TranslationContext } from 'src/modules/labs/translation-context/domain/translation-context.entity';

@Injectable()
export class GetTranslationContextUseCase {
  constructor(
    @Inject(TRANSLATION_CONTEXT_REPOSITORY)
    private readonly repo: TranslationContextRepository,
  ) {}

  async execute(id: string, userId: string): Promise<TranslationContext> {
    const context = await this.repo.findById(id);
    if (!context) throw new NotFoundException('TranslationContext not found');
    if (context.userId !== userId) throw new ForbiddenException();
    return context;
  }
}
