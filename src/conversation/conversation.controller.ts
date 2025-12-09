import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Body,
  Query,
  Patch,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post(':userId')
  async addMessage(
    @Param('userId') userId: string,
    @Body() body: { role: string; parts: { text: string }[] },
  ) {
    return this.conversationService.addMessage(userId, body.role, body.parts);
  }

  @Get(':userId')
  async getConversations(@Param('userId') userId: string) {
    return this.conversationService.getUserConversations(userId);
  }
  
  @Patch(':conversationId/summary')
  async updateSummary(
    @Param('conversationId') conversationId: string,
    @Body() body: { summary: string },
  ) {
    return this.conversationService.updateSummary(conversationId, body.summary);
  }

  @Delete('clear/:userId')
  async clearUserConversations(@Param('userId') userId: string) {
    return this.conversationService.clearConversations(userId);
  }

  @Delete('clear-old')
  async clearOld(@Query('days') days?: string) {
    return this.conversationService.clearOldConversations(
      days ? parseInt(days, 10) : 30,
    );
  }
}
