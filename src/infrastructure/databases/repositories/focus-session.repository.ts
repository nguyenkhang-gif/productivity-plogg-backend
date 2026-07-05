import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DuplicateSessionError,
  FocusSessionRepository,
} from 'src/core/domain/repositories/focus-session.repository.interface';
import { FocusSession as FocusSessionEntity } from 'src/core/domain/entities/focus-session.entity';
import {
  FocusSessionRaw,
  FocusSessionRawDocument,
} from '../schemas/focus-session-raw.schema';
import {
  FocusSessionDaily,
  FocusSessionDailyDocument,
} from '../schemas/focus-session-daily.schema';

const MONGO_DUPLICATE_KEY = 11000;

@Injectable()
export class MongoFocusSessionRepository implements FocusSessionRepository {
  constructor(
    @InjectModel(FocusSessionRaw.name)
    private readonly rawModel: Model<FocusSessionRawDocument>,
    @InjectModel(FocusSessionDaily.name)
    private readonly dailyModel: Model<FocusSessionDailyDocument>,
  ) {}

  async insertRaw(session: FocusSessionEntity): Promise<FocusSessionEntity> {
    try {
      const doc = await this.rawModel.create({
        userId: session.userId,
        clientSessionId: session.clientSessionId,
        completedAt: session.completedAt,
        localDate: session.localDate,
        durationMin: session.durationMin,
        xpEarned: session.xpEarned,
      });
      return new FocusSessionEntity({
        ...session,
        id: doc._id.toString(),
      });
    } catch (err: any) {
      if ((err?.code ?? err?.cause?.code) === MONGO_DUPLICATE_KEY) {
        throw new DuplicateSessionError(session.clientSessionId);
      }
      throw err;
    }
  }

  // All rollups write via $merge: idempotent (whenMatched: replace) and
  // requires the unique index on the `on` fields — defined in the schemas
  async rollupDaily(localDates: string[]): Promise<void> {
    await this.rawModel
      .aggregate([
        { $match: { localDate: { $in: localDates } } },
        {
          $group: {
            _id: { userId: '$userId', date: '$localDate' },
            sessionsCount: { $sum: 1 },
            totalFocusMin: { $sum: '$durationMin' },
            totalXp: { $sum: '$xpEarned' },
          },
        },
        {
          $project: {
            _id: 0,
            userId: '$_id.userId',
            date: '$_id.date',
            sessionsCount: 1,
            totalFocusMin: 1,
            totalXp: 1,
            // $merge bypasses Mongoose defaults — set createdAt here for the TTL index
            createdAt: '$$NOW',
          },
        },
        {
          $merge: {
            into: 'focus_sessions_daily',
            on: ['userId', 'date'],
            whenMatched: 'replace',
            whenNotMatched: 'insert',
          },
        },
      ])
      .exec();
  }

  async rollupWeekly(weekStart: string, weekEnd: string): Promise<void> {
    await this.dailyModel
      .aggregate([
        { $match: { date: { $gte: weekStart, $lte: weekEnd } } },
        {
          $group: {
            _id: '$userId',
            sessionsCount: { $sum: '$sessionsCount' },
            totalFocusMin: { $sum: '$totalFocusMin' },
            totalXp: { $sum: '$totalXp' },
          },
        },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            weekStart: { $literal: weekStart },
            sessionsCount: 1,
            totalFocusMin: 1,
            totalXp: 1,
          },
        },
        {
          $merge: {
            into: 'focus_sessions_weekly',
            on: ['userId', 'weekStart'],
            whenMatched: 'replace',
            whenNotMatched: 'insert',
          },
        },
      ])
      .exec();
  }

  async rollupMonthly(month: string): Promise<void> {
    // "YYYY-MM-DD" strings compare lexicographically, so a string range
    // covers the whole month
    await this.dailyModel
      .aggregate([
        { $match: { date: { $gte: `${month}-01`, $lte: `${month}-31` } } },
        {
          $group: {
            _id: '$userId',
            sessionsCount: { $sum: '$sessionsCount' },
            totalFocusMin: { $sum: '$totalFocusMin' },
            totalXp: { $sum: '$totalXp' },
          },
        },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            month: { $literal: month },
            sessionsCount: 1,
            totalFocusMin: 1,
            totalXp: 1,
          },
        },
        {
          $merge: {
            into: 'focus_sessions_monthly',
            on: ['userId', 'month'],
            whenMatched: 'replace',
            whenNotMatched: 'insert',
          },
        },
      ])
      .exec();
  }
}
