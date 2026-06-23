import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  authorId: string;

  @Prop({ type: String, enum: ['ORIGINAL', 'REPOST'], default: 'ORIGINAL' })
  type: string;

  @Prop({ type: String, default: null })
  title: string | null;

  @Prop({ required: true, maxlength: 10000, default: '' })
  content: string;

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ type: String, default: null })
  categoryId: string | null;

  @Prop({ type: [String], default: [] })
  tagIds: string[];

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  shareCount: number;

  @Prop({ type: String, enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'], default: 'PUBLIC' })
  visibility: string;

  // repost fields
  @Prop({ type: String, default: null })
  originalPostId: string | null;

  @Prop({ type: String, default: null, maxlength: 280 })
  caption: string | null;
}

export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ isPublished: 1, categoryId: 1, createdAt: -1 });
PostSchema.index({ isPublished: 1, tagIds: 1, createdAt: -1 });
PostSchema.index({ isPublished: 1, authorId: 1, createdAt: -1 });
PostSchema.index({ originalPostId: 1 });
PostSchema.index({ originalPostId: 1, authorId: 1 }, { unique: true, sparse: true });
