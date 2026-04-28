import { Conversation } from '../entities/conversation.entity';

export const CONVERSATION_REPOSITORY = 'CONVERSATION_REPOSITORY';

export interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findOrCreate(participants: string[]): Promise<Conversation>;
  findByUserId(userId: string): Promise<Conversation[]>;
  updateLastMessage(id: string, content: string, at: Date): Promise<void>;
}
