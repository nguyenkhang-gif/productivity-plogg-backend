import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EpubDocument = Epub & Document;

@Schema({ timestamps: true })
export class Epub {
  @Prop({ required: false })
  sampleUrl: string;

  @Prop({ required: true })
  createdUserId: string;

  @Prop({ required: true, type: Object })
  properties: Record<string, any>;
}

export const EpubSchema = SchemaFactory.createForClass(Epub);
