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

  @Prop({ required: true })
  passwordHash: string; // Tên ở database có thể mapping, nhưng ta giữ tên password/passwordHash tương đồng với entity. Để chuẩn, ta lưu passwordHash vì Clean Architecture. Mongoose coi đây là trường entity.
  
  @Prop({ enum: ['male', 'female', 'other'], required: true })
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
}

export const UserSchema = SchemaFactory.createForClass(User);
