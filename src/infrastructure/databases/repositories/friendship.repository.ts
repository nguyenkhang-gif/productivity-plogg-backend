import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FriendshipRepository,
} from 'src/core/domain/repositories/friendship.repository.interface';
import {
  Friendship as FriendshipEntity,
  FriendshipStatus,
} from 'src/core/domain/entities/friendship.entity';
import { Friendship, FriendshipDocument } from '../schemas/friendship.schema';

@Injectable()
export class MongoFriendshipRepository implements FriendshipRepository {
  constructor(
    @InjectModel(Friendship.name)
    private readonly model: Model<FriendshipDocument>,
  ) {}

  private mapToDomain(doc: FriendshipDocument): FriendshipEntity {
    return new FriendshipEntity({
      id: doc._id.toString(),
      userId: doc.userId,
      friendId: doc.friendId,
      status: doc.status as FriendshipStatus,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    });
  }

  async findById(id: string): Promise<FriendshipEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByPair(userId: string, friendId: string): Promise<FriendshipEntity | null> {
    const doc = await this.model
      .findOne({
        $or: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      })
      .exec();
    return doc ? this.mapToDomain(doc) : null;
  }

  async findFriends(userId: string): Promise<FriendshipEntity[]> {
    const docs = await this.model
      .find({
        $or: [{ userId }, { friendId: userId }],
        status: 'accepted',
      })
      .exec();
    return docs.map((d) => this.mapToDomain(d));
  }

  async findPendingReceived(userId: string): Promise<FriendshipEntity[]> {
    const docs = await this.model
      .find({ friendId: userId, status: 'pending' })
      .exec();
    return docs.map((d) => this.mapToDomain(d));
  }

  async findPendingSent(userId: string): Promise<FriendshipEntity[]> {
    const docs = await this.model
      .find({ userId, status: 'pending' })
      .exec();
    return docs.map((d) => this.mapToDomain(d));
  }

  async create(friendship: FriendshipEntity): Promise<FriendshipEntity> {
    const created = new this.model({
      userId: friendship.userId,
      friendId: friendship.friendId,
      status: friendship.status,
    });
    const saved = await created.save();
    return this.mapToDomain(saved);
  }

  async updateStatus(id: string, status: FriendshipStatus): Promise<FriendshipEntity> {
    const updated = await this.model
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!updated) throw new Error('Friendship not found');
    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}
