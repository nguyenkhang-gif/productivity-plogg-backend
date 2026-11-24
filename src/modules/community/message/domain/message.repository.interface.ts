import { EmbedProvider } from './message-embed.entity';
import { Message, MessageType } from './message.entity';

export const MESSAGE_REPOSITORY = 'MESSAGE_REPOSITORY';

export interface CreateMessageData {
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  replyToId?: string | null;
  type?: MessageType;
  content: string;
  embeds?: CreateMessageEmbedData[];
}

export interface CreateMessageEmbedData {
  url: string;
  provider: EmbedProvider;
  refId?: string | null;
}

export interface MessageRepository {
  findByChannel(
    channelId: string,
    cursor?: string,
    limit?: number,
  ): Promise<Message[]>;
  create(data: CreateMessageData): Promise<Message>;
  findById(messageId: string): Promise<Message | null>;
  softDelete(
    messageId: string,
    channelId: string,
    userId?: string,
  ): Promise<boolean>;
  edit(
    messageId: string,
    channelId: string,
    userId: string,
    content: string,
  ): Promise<Message | null>;
  addReaction(messageId: string, userId: string, emoji: string): Promise<void>;
  removeReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void>;
}
