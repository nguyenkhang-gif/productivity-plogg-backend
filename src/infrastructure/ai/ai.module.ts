import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { PromptTestUseCase } from 'src/use-case/ai/prompt-test.use-case';
import { AiController } from 'src/presentation/controllers/ai.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [GeminiService, PromptTestUseCase],
  exports: [GeminiService],
})
export class AiModule {}
