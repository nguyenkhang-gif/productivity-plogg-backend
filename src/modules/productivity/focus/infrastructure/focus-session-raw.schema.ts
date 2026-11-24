import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FocusSessionRawDocument = FocusSessionRaw & Document;

// Regular collection (not Time Series): the unique {userId, clientSessionId}
// index is what guarantees idempotent session recording, and Time Series
// collections don't support unique indexes.
@Schema({ collection: 'focus_sessions_raw' })
export class FocusSessionRaw {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  clientSessionId: string;

  @Prop({ required: true })
  completedAt: Date;

  // "YYYY-MM-DD" in the user's timezone, computed at ingest
  @Prop({ required: true })
  localDate: string;

  @Prop({ required: true })
  durationMin: number;

  @Prop({ required: true })
  xpEarned: number;
}

export const FocusSessionRawSchema =
  SchemaFactory.createForClass(FocusSessionRaw);

FocusSessionRawSchema.index(
  { userId: 1, clientSessionId: 1 },
  { unique: true },
);
FocusSessionRawSchema.index({ userId: 1, localDate: 1 });
// Raw sessions expire after 30 days — history lives in the rollup collections
FocusSessionRawSchema.index(
  { completedAt: 1 },
  { expireAfterSeconds: 2592000 },
);
