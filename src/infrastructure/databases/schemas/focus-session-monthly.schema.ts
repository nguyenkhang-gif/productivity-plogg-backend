import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FocusSessionMonthlyDocument = FocusSessionMonthly & Document;

@Schema({ collection: 'focus_sessions_monthly' })
export class FocusSessionMonthly {
  @Prop({ required: true })
  userId: string;

  // "YYYY-MM"
  @Prop({ required: true })
  month: string;

  @Prop({ required: true })
  sessionsCount: number;

  @Prop({ required: true })
  totalFocusMin: number;

  @Prop({ required: true })
  totalXp: number;
}

export const FocusSessionMonthlySchema =
  SchemaFactory.createForClass(FocusSessionMonthly);

FocusSessionMonthlySchema.index({ userId: 1, month: 1 }, { unique: true });
