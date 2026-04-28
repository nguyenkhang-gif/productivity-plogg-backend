import { Message } from '../entities/message.entity';

export const MESSAGE_REPOSITORY = 'MESSAGE_REPOSITORY';

export interface MessageRepository {
  save(message: Message): Promise<Message>;
  findByConversationId(conversationId: string, limit: number, before?: Date): Promise<Message[]>;
}
