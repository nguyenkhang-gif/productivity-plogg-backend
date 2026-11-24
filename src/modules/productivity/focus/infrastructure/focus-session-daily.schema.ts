import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FocusSessionDailyDocument = FocusSessionDaily & Document;

// Written by the nightly rollup via $merge (bypasses Mongoose) — the
// pipeline must set createdAt itself for the TTL index to work.
@Schema({ collection: 'focus_sessions_daily' })
export class FocusSessionDaily {
  @Prop({ required: true })
  userId: string;

  // "YYYY-MM-DD"
  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  sessionsCount: number;

  @Prop({ required: true })
  totalFocusMin: number;

  @Prop({ required: true })
  totalXp: number;

  @Prop({ required: true })
  createdAt: Date;
}

export const FocusSessionDailySchema =
  SchemaFactory.createForClass(FocusSessionDaily);

FocusSessionDailySchema.index({ userId: 1, date: 1 }, { unique: true });
// Daily docs expire after 1 year — weekly/monthly rollups are kept forever
FocusSessionDailySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 31536000 },
);
