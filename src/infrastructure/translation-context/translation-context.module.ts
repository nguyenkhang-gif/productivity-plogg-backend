import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TranslationContext,
  TranslationContextSchema,
} from 'src/infrastructure/databases/schemas/translation-context.schema';
import { MongoTranslationContextRepository } from 'src/infrastructure/databases/repositories/translation-context.repository';
import { TRANSLATION_CONTEXT_REPOSITORY } from 'src/core/domain/repositories/translation-context.repository.interface';
import { TranslationContextController } from 'src/presentation/controllers/translation-context.controller';
import { CreateTranslationContextUseCase } from 'src/use-case/translation-context/create-translation-context.use-case';
import { GetTranslationContextUseCase } from 'src/use-case/translation-context/get-translation-context.use-case';
import { GetUserTranslationContextsUseCase } from 'src/use-case/translation-context/get-user-translation-contexts.use-case';
import { UpdateTranslationContextUseCase } from 'src/use-case/translation-context/update-translation-context.use-case';
import { DeleteTranslationContextUseCase } from 'src/use-case/translation-context/delete-translation-context.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TranslationContext.name, schema: TranslationContextSchema },
    ]),
  ],
  controllers: [TranslationContextController],
  providers: [
    { provide: TRANSLATION_CONTEXT_REPOSITORY, useClass: MongoTranslationContextRepository },
    CreateTranslationContextUseCase,
    GetTranslationContextUseCase,
    GetUserTranslationContextsUseCase,
    UpdateTranslationContextUseCase,
    DeleteTranslationContextUseCase,
  ],
})
export class TranslationContextModule {}
