import { Inject, Injectable } from '@nestjs/common';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from 'src/core/domain/repositories/message.repository.interface';
import { Message } from 'src/core/domain/entities/message.entity';

@Injectable()
export class GetMessagesUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messageRepo: MessageRepository,
  ) {}

  async execute(
    conversationId: string,
    limit = 30,
    before?: Date,
  ): Promise<Message[]> {
    return this.messageRepo.findByConversationId(conversationId, limit, before);
  }
}
