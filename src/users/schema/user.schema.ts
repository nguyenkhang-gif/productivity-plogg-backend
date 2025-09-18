import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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
  password: string;

  @Prop({ enum: ['male', 'female', 'other'], required: true })
  gender: string;

  @Prop({ required: false })
  profilePic: string;

  @Prop({ enum: ['basic', 'advance', 'premium'], default: 'basic' })
  membership: string;

  @Prop({ enum: ['user', 'admin', 'moderator'], default: 'user' })
  role: string;




  @Prop({ required: false })
  resetPasswordToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
