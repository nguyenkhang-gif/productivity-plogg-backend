import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../../core/domain/enums/user-role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false, default: '' })
  passwordHash: string;

  @Prop({
    enum: ['male', 'female', 'other'],
    required: false,
    default: 'other',
  })
  gender: string;

  @Prop({ required: false })
  profilePic?: string;

  @Prop({ enum: ['basic', 'advance', 'premium'], default: 'basic' })
  membership: string;

  @Prop({ enum: Object.values(UserRole), default: UserRole.User })
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

UserSchema.index({ role: 1 });
UserSchema.index({ membership: 1 });
UserSchema.index({ createdAt: -1 });
