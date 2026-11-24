import { MessageEmbed } from './message-embed.entity';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

export interface MessageAttachment {
  id: string;
  url: string;
  type: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export class Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  replyToId?: string | null;
  type: MessageType;
  content: string;
  isDeleted: boolean;
  editedAt?: Date | null;
  createdAt?: Date;

  replyTo?: Message | null;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  embeds?: MessageEmbed[];

  constructor(partial: Partial<Message>) {
    Object.assign(this, partial);
  }
}
