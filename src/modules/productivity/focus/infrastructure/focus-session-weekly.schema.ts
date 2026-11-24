import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FocusSessionWeeklyDocument = FocusSessionWeekly & Document;

@Schema({ collection: 'focus_sessions_weekly' })
export class FocusSessionWeekly {
  @Prop({ required: true })
  userId: string;

  // Monday of the ISO week, "YYYY-MM-DD"
  @Prop({ required: true })
  weekStart: string;

  @Prop({ required: true })
  sessionsCount: number;

  @Prop({ required: true })
  totalFocusMin: number;

  @Prop({ required: true })
  totalXp: number;
}

export const FocusSessionWeeklySchema =
  SchemaFactory.createForClass(FocusSessionWeekly);

FocusSessionWeeklySchema.index({ userId: 1, weekStart: 1 }, { unique: true });
