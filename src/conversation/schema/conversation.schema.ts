import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Message {
  @Prop({ required: true, enum: ['user', 'model', 'assistant'] })
  role: string;

  @Prop({ required: true })
  parts: {
    text: string;
  }[];

  @Prop({ default: Date.now, required: false })
  timestamp?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [MessageSchema], default: [] })
  messages: Message[];

  @Prop({ default: '' })
  summary: string;

  @Prop({ default: Date.now })
  lastInteraction: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
