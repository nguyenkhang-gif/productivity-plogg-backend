import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: 0 })
  postCount: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ postCount: -1 });
