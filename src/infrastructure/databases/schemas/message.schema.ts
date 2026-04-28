import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Message {
  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true, maxlength: 5000 })
  content: string;

  @Prop({ enum: ['text', 'image'], default: 'text' })
  type: string;

  @Prop({ type: [String], default: [] })
  readBy: string[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
