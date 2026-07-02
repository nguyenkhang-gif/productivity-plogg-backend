import { Inject, Injectable } from '@nestjs/common';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from 'src/core/domain/repositories/conversation.repository.interface';
import { Conversation } from 'src/core/domain/entities/conversation.entity';

@Injectable()
export class GetConversationsUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepo: ConversationRepository,
  ) {}

  async execute(userId: string): Promise<Conversation[]> {
    return this.conversationRepo.findByUserId(userId);
  }
}
