import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReactionDocument = Reaction & Document;

@Schema({ timestamps: true })
export class Reaction {
  @Prop({ required: true })
  postId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  type: string;

  @Prop()
  icon?: string;
}

export const ReactionSchema = SchemaFactory.createForClass(Reaction);

ReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });
