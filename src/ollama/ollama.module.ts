import { Module } from '@nestjs/common';
import { BudgetModule } from 'src/budget/budget.module';
import { OllamaService } from './ollama.service';
import { OllamaController } from './ollama.controller';
import { ConversationModule } from 'src/conversation/conversation.module';

@Module({
  imports: [BudgetModule,ConversationModule,BudgetModule],
  providers: [OllamaService],
  controllers: [OllamaController],
})
export class OllamaModule {}
