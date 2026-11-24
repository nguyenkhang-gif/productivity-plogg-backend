import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  TRANSLATION_CONTEXT_REPOSITORY,
  TranslationContextRepository,
} from 'src/modules/labs/translation-context/domain/translation-context.repository.interface';
import { TranslationContext } from 'src/modules/labs/translation-context/domain/translation-context.entity';
import { UpdateTranslationContextDto } from 'src/modules/labs/translation-context/application/dto/translation-context.dto';

@Injectable()
export class UpdateTranslationContextUseCase {
  constructor(
    @Inject(TRANSLATION_CONTEXT_REPOSITORY)
    private readonly repo: TranslationContextRepository,
  ) {}

  async execute(
    id: string,
    userId: string,
    dto: UpdateTranslationContextDto,
  ): Promise<TranslationContext> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('TranslationContext not found');
    if (existing.userId !== userId) throw new ForbiddenException();
    return this.repo.update(id, dto as any);
  }
}
