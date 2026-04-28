export type MessageType = 'text' | 'image';

export class Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  readBy: string[];
  createdAt: Date;

  constructor(partial: Partial<Message>) {
    Object.assign(this, partial);
  }
}
