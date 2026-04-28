import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { EpubModule } from 'src/infrastructure/epub/epub.module';
import { DriveService } from 'src/google/drive.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Brain, Brains } from './schema/brain.schema';
import { BudgetModule } from 'src/budget/budget.module';

@Module({
  imports: [
    EpubModule,
    MongooseModule.forFeature([{ name: Brain.name, schema: Brains }]),
    BudgetModule
  ],
  providers: [
    GeminiService,
    DriveService,
  ],
  controllers: [GeminiController],
})
export class GeminiModule {}
