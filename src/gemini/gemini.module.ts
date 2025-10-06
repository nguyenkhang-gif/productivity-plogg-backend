import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { EpubModule } from 'src/epub/epub.module';
import { EpubService } from 'src/epub/epub.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { DriveService } from 'src/google/drive.service';

@Module({
  imports: [EpubModule],
  providers: [GeminiService, SupabaseService,DriveService],
  controllers: [GeminiController],
})
export class GeminiModule {}
