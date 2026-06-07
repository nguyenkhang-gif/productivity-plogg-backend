import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({ timestamps: true })
export class Tag {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: 0 })
  postCount: number;
}

export const TagSchema = SchemaFactory.createForClass(Tag);

TagSchema.index({ postCount: -1 });
