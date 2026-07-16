import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Message } from 'src/core/domain/entities/message.entity';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from 'src/core/domain/repositories/message.repository.interface';

@Injectable()
export class EditMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messageRepo: MessageRepository,
  ) {}

  async execute(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<Message> {
    const updated = await this.messageRepo.edit(messageId, userId, content);
    if (!updated)
      throw new ForbiddenException('Not the author or message not found');

    return updated;
  }
}
