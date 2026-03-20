import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TranscriptionDocument = Transcription & Document;

@Schema({ timestamps: true }) // Tự động thêm createdAt và updatedAt
export class Transcription {
  @Prop({ required: true})
  jobId: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  fileName: string;

  @Prop({ default: 'completed' })
  status: string;
}

export const TranscriptionSchema = SchemaFactory.createForClass(Transcription);