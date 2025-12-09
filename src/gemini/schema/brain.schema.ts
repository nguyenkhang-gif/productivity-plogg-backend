import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type BrainDocument = Brain & Document;

@Schema({ timestamps: true })
export class Brain extends Document {
  @Prop({ type: Object })
  data: any;
}

export const Brains = SchemaFactory.createForClass(Brain);
