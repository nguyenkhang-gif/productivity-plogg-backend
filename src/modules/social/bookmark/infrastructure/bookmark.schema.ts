import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BookmarkDocument = Bookmark & Document;

@Schema({ timestamps: true })
export class Bookmark {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  postId: string;
}

export const BookmarkSchema = SchemaFactory.createForClass(Bookmark);

BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });
BookmarkSchema.index({ postId: 1, userId: 1 });
