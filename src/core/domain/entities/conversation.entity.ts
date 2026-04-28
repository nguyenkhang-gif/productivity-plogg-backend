export class Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Conversation>) {
    Object.assign(this, partial);
  }
}
