import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { EpubModule } from 'src/epub/epub.module';
import { EpubService } from 'src/epub/epub.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { DriveService } from 'src/google/drive.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Brain, Brains } from './schema/brain.schema';
import { ConversationModule } from 'src/conversation/conversation.module';
import { ConversationService } from 'src/conversation/conversation.service';
import {
  Conversation,
  ConversationSchema,
} from '../conversation/schema/conversation.schema';
import { BudgetModule } from 'src/budget/budget.module';

@Module({
  imports: [
    EpubModule,
    MongooseModule.forFeature([{ name: Brain.name, schema: Brains }]),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    ConversationModule,
    BudgetModule
  ],
  providers: [
    GeminiService,
    SupabaseService,
    DriveService,
    ConversationService,
  ],
  controllers: [GeminiController],
})
export class GeminiModule {}
