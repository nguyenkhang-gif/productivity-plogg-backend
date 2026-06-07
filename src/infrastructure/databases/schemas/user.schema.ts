import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Tự động thêm createdAt và updatedAt
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false, default: '' })
  passwordHash: string;
  
  @Prop({ enum: ['male', 'female', 'other'], required: false, default: 'other' })
  gender: string;

  @Prop({ required: false })
  profilePic?: string;

  @Prop({ enum: ['basic', 'advance', 'premium'], default: 'basic' })
  membership: string;

  @Prop({ enum: ['user', 'admin', 'moderator'], default: 'user' })
  role: string;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ required: false })
  resetPasswordToken?: string;

  @Prop({ required: false })
  googleId?: string;

  @Prop({ required: false })
  facebookId?: string;

  @Prop({ type: Date, default: null })
  lastSeen: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
