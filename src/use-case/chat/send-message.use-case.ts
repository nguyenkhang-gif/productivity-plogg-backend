import { Inject, Injectable } from '@nestjs/common';
import { MESSAGE_REPOSITORY, MessageRepository } from 'src/core/domain/repositories/message.repository.interface';
import { CONVERSATION_REPOSITORY, ConversationRepository } from 'src/core/domain/repositories/conversation.repository.interface';
import { Message } from 'src/core/domain/entities/message.entity';

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  type?: 'text' | 'image';
}

@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messageRepo: MessageRepository,
    @Inject(CONVERSATION_REPOSITORY) private readonly conversationRepo: ConversationRepository,
  ) {}

  async execute(input: SendMessageInput): Promise<Message> {
    const now = new Date();
    const message = await this.messageRepo.save(
      new Message({
        conversationId: input.conversationId,
        senderId: input.senderId,
        content: input.content,
        type: input.type ?? 'text',
        readBy: [input.senderId],
        createdAt: now,
      }),
    );

    await this.conversationRepo.updateLastMessage(input.conversationId, input.content, now);

    return message;
  }
}
