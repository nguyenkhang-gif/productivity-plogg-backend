import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type EpubDocument = Epub & Document;

@Schema({ timestamps: true })
export class Epub extends Document {
  @Prop({ required: false })
  sampleUrl: string;

  @Prop({ required: true })
  createdUserId: string;

  @Prop({ required: true, type: Object })
  properties: object;
}

export const Epubs = SchemaFactory.createForClass(Epub);
