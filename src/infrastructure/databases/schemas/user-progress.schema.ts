import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserProgressDocument = UserProgress & Document;

@Schema({ timestamps: true, collection: 'user_progress' })
export class UserProgress {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, default: 0 })
  totalXp: number;

  @Prop({ required: true, default: 0 })
  totalFocusMin: number;

  @Prop()
  drinkId?: string;

  // Minutes east of UTC (e.g. Vietnam = +420)
  @Prop({ required: true, default: 0 })
  tzOffset: number;

  @Prop({ required: true, default: 0 })
  todayCount: number;

  @Prop({ required: true, default: 0 })
  todayFocusMin: number;

  // "YYYY-MM-DD" in the user's timezone
  @Prop()
  lastActiveLocalDate?: string;

  @Prop({ required: true, default: 0 })
  currentStreak: number;

  @Prop({ required: true, default: 0 })
  longestStreak: number;
}

export const UserProgressSchema = SchemaFactory.createForClass(UserProgress);

UserProgressSchema.index({ userId: 1 }, { unique: true });
