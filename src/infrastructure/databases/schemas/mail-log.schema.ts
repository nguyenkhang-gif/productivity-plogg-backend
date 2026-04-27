import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MailLogDocument = MailLog & Document;

@Schema({ timestamps: true })
export class MailLog {
  @Prop({ required: true })
  to: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  body: string;

  @Prop({ required: true, enum: ['sent', 'failed'] })
  status: string;

  @Prop()
  error?: string;

  @Prop({ required: true })
  sentAt: Date;
}

export const MailLogSchema = SchemaFactory.createForClass(MailLog);
