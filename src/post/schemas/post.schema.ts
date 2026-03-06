import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  title: string;

  @Prop({
    trim: true,
    maxlength: 500,
  })
  description: string;

  @Prop({
    required: true,
  })
  content: string; 

  @Prop()
  thumbnail: string;

  @Prop({
    default: true,
  })
  isPublished: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);
