import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './infrastructure/gemini.service';
import { PromptTestUseCase } from 'src/modules/labs/ai/application/prompt-test.use-case';
import { AiController } from 'src/modules/labs/ai/presentation/ai.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [GeminiService, PromptTestUseCase],
  exports: [GeminiService],
})
export class AiModule {}
