import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './infrastructure/gemini.service';
import { TEXT_GENERATOR } from 'src/modules/labs/ai/domain/text-generator.port';
import { PromptTestUseCase } from 'src/modules/labs/ai/application/prompt-test.use-case';
import { AiController } from 'src/modules/labs/ai/presentation/ai.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [
    GeminiService,
    { provide: TEXT_GENERATOR, useExisting: GeminiService },
    PromptTestUseCase,
  ],
  exports: [GeminiService],
})
export class AiModule {}
