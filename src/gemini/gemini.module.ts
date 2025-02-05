import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { EpubModule } from 'src/epub/epub.module';
import { EpubService } from 'src/epub/epub.service';

@Module({
  imports: [EpubModule],
  providers: [GeminiService],
  controllers: [GeminiController],
})
export class GeminiModule {}
