import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TranslationContext,
  TranslationContextSchema,
} from 'src/modules/labs/translation-context/infrastructure/translation-context.schema';
import { MongoTranslationContextRepository } from 'src/modules/labs/translation-context/infrastructure/translation-context.repository';
import { TRANSLATION_CONTEXT_REPOSITORY } from 'src/modules/labs/translation-context/domain/translation-context.repository.interface';
import { TranslationContextController } from 'src/modules/labs/translation-context/presentation/translation-context.controller';
import { CreateTranslationContextUseCase } from 'src/modules/labs/translation-context/application/create-translation-context.use-case';
import { GetTranslationContextUseCase } from 'src/modules/labs/translation-context/application/get-translation-context.use-case';
import { GetUserTranslationContextsUseCase } from 'src/modules/labs/translation-context/application/get-user-translation-contexts.use-case';
import { UpdateTranslationContextUseCase } from 'src/modules/labs/translation-context/application/update-translation-context.use-case';
import { DeleteTranslationContextUseCase } from 'src/modules/labs/translation-context/application/delete-translation-context.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TranslationContext.name, schema: TranslationContextSchema },
    ]),
  ],
  controllers: [TranslationContextController],
  providers: [
    {
      provide: TRANSLATION_CONTEXT_REPOSITORY,
      useClass: MongoTranslationContextRepository,
    },
    CreateTranslationContextUseCase,
    GetTranslationContextUseCase,
    GetUserTranslationContextsUseCase,
    UpdateTranslationContextUseCase,
    DeleteTranslationContextUseCase,
  ],
})
export class TranslationContextModule {}
