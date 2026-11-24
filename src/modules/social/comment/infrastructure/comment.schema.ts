import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ required: true })
  postId: string;

  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true, maxlength: 1000 })
  content: string;

  @Prop({ required: false })
  iconUrl?: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

CommentSchema.index({ postId: 1, createdAt: -1 });
