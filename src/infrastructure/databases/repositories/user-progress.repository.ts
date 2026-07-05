import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FocusConfigPatch,
  SessionDelta,
  UserProgressRepository,
} from 'src/core/domain/repositories/user-progress.repository.interface';
import { UserProgress as UserProgressEntity } from 'src/core/domain/entities/user-progress.entity';
import {
  UserProgress,
  UserProgressDocument,
} from '../schemas/user-progress.schema';

@Injectable()
export class MongoUserProgressRepository implements UserProgressRepository {
  constructor(
    @InjectModel(UserProgress.name)
    private readonly model: Model<UserProgressDocument>,
  ) {}

  private mapToDomain(doc: any): UserProgressEntity {
    return new UserProgressEntity({
      id: doc._id.toString(),
      userId: doc.userId,
      totalXp: doc.totalXp,
      totalFocusMin: doc.totalFocusMin,
      drinkId: doc.drinkId,
      tzOffset: doc.tzOffset,
      todayCount: doc.todayCount,
      todayFocusMin: doc.todayFocusMin,
      lastActiveLocalDate: doc.lastActiveLocalDate,
      currentStreak: doc.currentStreak,
      longestStreak: doc.longestStreak,
      updatedAt: doc.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<UserProgressEntity | null> {
    const doc = await this.model.findOne({ userId }).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async applySession(
    userId: string,
    delta: SessionDelta,
  ): Promise<UserProgressEntity> {
    const doc = await this.model
      .findOneAndUpdate(
        { userId },
        {
          $inc: { totalXp: delta.xp, totalFocusMin: delta.focusMin },
          $set: {
            tzOffset: delta.tzOffset,
            todayCount: delta.todayCount,
            todayFocusMin: delta.todayFocusMin,
            lastActiveLocalDate: delta.localDate,
            currentStreak: delta.currentStreak,
            longestStreak: delta.longestStreak,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    return this.mapToDomain(doc);
  }

  async updateConfig(
    userId: string,
    patch: FocusConfigPatch,
  ): Promise<UserProgressEntity> {
    const $set: Record<string, unknown> = {};
    if (patch.drinkId !== undefined) $set.drinkId = patch.drinkId;
    if (patch.tzOffset !== undefined) $set.tzOffset = patch.tzOffset;

    const doc = await this.model
      .findOneAndUpdate(
        { userId },
        { $set },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    return this.mapToDomain(doc);
  }
}
