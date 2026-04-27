import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true, maxlength: 10000 })
  content: string;

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: true })
  isPublished: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);
