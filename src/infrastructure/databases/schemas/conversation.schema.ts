import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: [String], required: true })
  participants: string[];

  @Prop({ default: null })
  lastMessage: string;

  @Prop({ default: null })
  lastMessageAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ participants: 1 });
